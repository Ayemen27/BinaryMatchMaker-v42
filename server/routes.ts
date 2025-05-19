import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { Signal, insertSignalSchema } from "@shared/schema";
import { z } from "zod";
import signalGeneratorRoutes from "./routes/signal-generator";
import userSettingsRoutes from "./routes/user-settings";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Signal generator routes with AI
  app.use('/api/signal-generator', signalGeneratorRoutes);
  
  // User settings routes
  app.use('/api/user/settings', userSettingsRoutes);

  // API routes
  // Get signals for current user (active + user's favorites)
  app.get("/api/signals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // الحصول على معرف المستخدم الحالي
      const userId = req.user.id;
      
      // الحصول على الإشارات النشطة العامة
      const activeSignals = await storage.getActiveSignals();
      
      // الحصول على إشارات المستخدم (المفضلة والخاصة به)
      const userSignals = await storage.getUserSignals(userId);
      
      // دمج الإشارات وإزالة التكرار
      const userSignalIds = new Set(userSignals.map(us => us.signal.id));
      const allSignals = [
        ...userSignals.map(us => ({
          ...us.signal,
          isFavorite: us.isFavorite,
          notes: us.notes,
          isUserSpecific: true
        })),
        ...activeSignals
          .filter(signal => !userSignalIds.has(signal.id))
          .map(signal => ({
            ...signal,
            isFavorite: false,
            notes: null,
            isUserSpecific: false
          }))
      ];
      
      res.json(allSignals);
    } catch (error) {
      console.error("خطأ في جلب الإشارات:", error);
      res.status(500).json({ message: "Failed to fetch signals" });
    }
  });

  // Get signal history specific to the user
  app.get("/api/signals/history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // الحصول على معرف المستخدم الحالي
      const userId = req.user.id;
      
      // الحصول على الإشارات المكتملة العامة
      const completedSignals = await storage.getCompletedSignals();
      
      // الحصول على إشارات المستخدم المكتملة
      const userSignals = await storage.getUserSignals(userId);
      const userCompletedSignals = userSignals
        .filter(us => us.signal.status === 'completed');
      
      // دمج الإشارات وإزالة التكرار
      const userSignalIds = new Set(userCompletedSignals.map(us => us.signal.id));
      const historySignals = [
        ...userCompletedSignals.map(us => ({
          ...us.signal,
          isFavorite: us.isFavorite,
          notes: us.notes,
          isUserSpecific: true
        })),
        ...completedSignals
          .filter(signal => !userSignalIds.has(signal.id))
          .map(signal => ({
            ...signal,
            isFavorite: false,
            notes: null,
            isUserSpecific: false
          }))
      ];
      
      res.json(historySignals);
    } catch (error) {
      console.error("خطأ في جلب سجل الإشارات:", error);
      res.status(500).json({ message: "Failed to fetch signal history" });
    }
  });

  // Get signal by ID with user-specific data
  app.get("/api/signals/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid signal ID" });
      }

      // Get the signal
      const signal = await storage.getSignalById(id);
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      // Track the view in signal usage
      await storage.trackSignalUsage(userId, 'viewed');

      // Check if user has this signal in their collection
      const userSignals = await storage.getUserSignals(userId);
      const userSignal = userSignals.find(us => us.signal.id === id);

      if (userSignal) {
        // Return with user-specific data
        res.json({
          ...signal,
          isFavorite: userSignal.isFavorite,
          notes: userSignal.notes,
          isUserSpecific: true
        });
      } else {
        // If user doesn't have relation to this signal yet, create it
        await storage.addSignalToUser(userId, id);
        
        // Return without user specifics
        res.json({
          ...signal,
          isFavorite: false,
          notes: null,
          isUserSpecific: false
        });
      }
    } catch (error) {
      console.error("خطأ في جلب الإشارة:", error);
      res.status(500).json({ message: "Failed to fetch signal" });
    }
  });

  // Create new signal
  app.post("/api/signals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = insertSignalSchema.parse(req.body);
      const signal = await storage.createSignal(validatedData);
      res.status(201).json(signal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid signal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create signal" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { username, email, fullName } = req.body;
      const updatedUser = await storage.updateUserProfile(req.user.id, { 
        username, 
        email, 
        fullName 
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user password
  app.patch("/api/user/password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;
      // Password change logic would go here
      // This is a mock response for now
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Update user language preference
  app.patch("/api/user/language", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { language } = req.body;
      if (language !== 'ar' && language !== 'en') {
        return res.status(400).json({ message: "Invalid language" });
      }

      const updatedUser = await storage.updateUserLanguage(req.user.id, language);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update language preference" });
    }
  });

  // Update notification settings
  app.patch("/api/user/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // In a real app, validate and save notification settings
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
