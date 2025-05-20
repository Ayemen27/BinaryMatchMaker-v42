import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { Signal, insertSignalSchema, UserNotificationSettings } from "@shared/schema";
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

  // Create new signal and associate it with the current user
  app.post("/api/signals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      const validatedData = insertSignalSchema.parse(req.body);
      
      // تعيين المستخدم الحالي كمنشئ للإشارة
      const signalData = {
        ...validatedData,
        createdBy: userId,
        isPublic: validatedData.isPublic !== false, // افتراضياً جعل الإشارة عامة إلا إذا تم تحديد غير ذلك
      };
      
      // إنشاء الإشارة
      const signal = await storage.createSignal(signalData);
      
      // إضافة الإشارة لقائمة إشارات المستخدم
      await storage.addSignalToUser(userId, signal.id);
      
      // تتبع استخدام الإشارة
      await storage.trackSignalUsage(userId, 'generated');
      
      res.status(201).json({
        ...signal,
        isFavorite: false,
        notes: null,
        isUserSpecific: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid signal data", errors: error.errors });
      }
      console.error("خطأ في إنشاء الإشارة:", error);
      res.status(500).json({ message: "Failed to create signal" });
    }
  });
  
  // وضع علامة على إشارة كمفضلة
  app.post("/api/signals/:id/favorite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const signalId = parseInt(req.params.id);
      const { isFavorite } = req.body;
      
      if (isNaN(signalId)) {
        return res.status(400).json({ message: "Invalid signal ID" });
      }
      
      if (typeof isFavorite !== 'boolean') {
        return res.status(400).json({ message: "isFavorite must be a boolean" });
      }
      
      const userSignal = await storage.markSignalAsFavorite(userId, signalId, isFavorite);
      
      res.json({
        success: true,
        signalId,
        isFavorite
      });
    } catch (error) {
      console.error("خطأ في تحديث حالة المفضلة:", error);
      res.status(500).json({ message: "Failed to update favorite status" });
    }
  });
  
  // إضافة ملاحظات إلى إشارة
  app.post("/api/signals/:id/notes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const signalId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (isNaN(signalId)) {
        return res.status(400).json({ message: "Invalid signal ID" });
      }
      
      if (typeof notes !== 'string') {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      
      const userSignal = await storage.updateUserSignalNotes(userId, signalId, notes);
      
      res.json({
        success: true,
        signalId,
        notes
      });
    } catch (error) {
      console.error("خطأ في تحديث ملاحظات الإشارة:", error);
      res.status(500).json({ message: "Failed to update signal notes" });
    }
  });
  
  // الحصول على إشارات المستخدم الخاصة فقط
  app.get("/api/user/signals", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const userSignals = await storage.getUserSignals(userId);
      
      // تنسيق البيانات بشكل مناسب للواجهة
      const formattedSignals = userSignals.map(us => ({
        ...us.signal,
        isFavorite: us.isFavorite,
        notes: us.notes,
        isUserSpecific: true
      }));
      
      res.json(formattedSignals);
    } catch (error) {
      console.error("خطأ في جلب إشارات المستخدم:", error);
      res.status(500).json({ message: "Failed to fetch user signals" });
    }
  });
  
  // الحصول على إشارات المستخدم المفضلة فقط
  app.get("/api/user/signals/favorites", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const favoriteSignals = await storage.getUserFavoriteSignals(userId);
      
      // تنسيق البيانات بشكل مناسب للواجهة
      const formattedSignals = favoriteSignals.map(us => ({
        ...us.signal,
        isFavorite: us.isFavorite,
        notes: us.notes,
        isUserSpecific: true
      }));
      
      res.json(formattedSignals);
    } catch (error) {
      console.error("خطأ في جلب الإشارات المفضلة:", error);
      res.status(500).json({ message: "Failed to fetch favorite signals" });
    }
  });
  
  // الحصول على إحصائيات المستخدم
  app.get("/api/user/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      
      // الحصول على إحصائيات المستخدم 
      const today = new Date();
      const signalUsage = await storage.getSignalUsage(userId, today);
      const userSignals = await storage.getUserSignals(userId);
      const favoriteSignals = await storage.getUserFavoriteSignals(userId);
      
      const userStats = {
        totalSignals: userSignals.length,
        favoriteSignals: favoriteSignals.length,
        signalsGenerated: signalUsage?.signalsGenerated || 0,
        signalsViewed: signalUsage?.signalsViewed || 0,
        analysisRequested: signalUsage?.analysisRequested || 0,
        // إضافة المزيد من الإحصائيات حسب الحاجة
      };
      
      res.json(userStats);
    } catch (error) {
      console.error("خطأ في جلب إحصائيات المستخدم:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Update user profile - دعم طلبات PATCH و PUT
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('طلب تحديث معلومات المستخدم - PATCH:', {
        userId: req.user.id,
        body: req.body
      });

      const { username, email, fullName } = req.body;
      const updatedUser = await storage.updateUserProfile(req.user.id, { 
        username, 
        email, 
        fullName 
      });

      console.log('تم تحديث معلومات المستخدم بنجاح:', updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error('خطأ في تحديث معلومات المستخدم:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // إضافة دعم طلبات PUT للملف الشخصي (للتوافق مع التحديثات الجديدة)
  app.put("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('طلب تحديث معلومات المستخدم - PUT:', {
        userId: req.user.id,
        body: req.body
      });

      const { username, email, fullName } = req.body;
      const updatedUser = await storage.updateUserProfile(req.user.id, { 
        username, 
        email, 
        fullName 
      });

      console.log('تم تحديث معلومات المستخدم بنجاح:', updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error('خطأ في تحديث معلومات المستخدم:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user password - دعم طلبات PATCH و PUT
  app.patch("/api/user/password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('طلب تحديث كلمة المرور - PATCH:', {
        userId: req.user.id
      });

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "يجب توفير كلمة المرور الحالية والجديدة" });
      }
      
      // الحصول على المستخدم الحالي
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // التحقق من صحة كلمة المرور الحالية (في بيئة حقيقية يجب استخدام تشفير أقوى)
      if (user.password !== currentPassword) {
        return res.status(403).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      
      // تحديث كلمة المرور
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        password: newPassword
      });
      
      console.log('تم تحديث كلمة المرور بنجاح');
      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في تحديث كلمة المرور:', error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  
  // دعم طلبات PUT لتحديث كلمة المرور (للتوافق مع التحديثات الجديدة)
  app.put("/api/user/password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log('طلب تحديث كلمة المرور - PUT:', {
        userId: req.user.id
      });

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "يجب توفير كلمة المرور الحالية والجديدة" });
      }
      
      // الحصول على المستخدم الحالي
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // التحقق من صحة كلمة المرور الحالية (في بيئة حقيقية يجب استخدام تشفير أقوى)
      if (user.password !== currentPassword) {
        return res.status(403).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      
      // تحديث كلمة المرور
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        password: newPassword
      });
      
      console.log('تم تحديث كلمة المرور بنجاح');
      res.json({ success: true });
    } catch (error) {
      console.error('خطأ في تحديث كلمة المرور:', error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // تحديث لغة المستخدم المفضلة (دعم طلبات PUT أيضًا للتوافق مع التحديثات الجديدة)
  app.put("/api/user/language", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول." });
      }

      console.log('طلب تحديث لغة المستخدم - PUT:', {
        userId: req.user.id,
        body: req.body
      });

      const { language } = req.body;
      if (language !== 'ar' && language !== 'en') {
        return res.status(400).json({ message: "لغة غير صالحة" });
      }

      const updatedUser = await storage.updateUserLanguage(req.user.id, language);
      res.json({
        ...updatedUser,
        language,
        _serverTime: new Date().toISOString()
      });
    } catch (error) {
      console.error("خطأ في تحديث تفضيلات اللغة:", error);
      res.status(500).json({ message: "فشل تحديث تفضيلات اللغة" });
    }
  });
  
  // دعم PATCH للتوافق الخلفي
  app.patch("/api/user/language", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول." });
      }

      console.log('طلب تحديث لغة المستخدم - PATCH:', {
        userId: req.user.id,
        body: req.body
      });

      const { language } = req.body;
      if (language !== 'ar' && language !== 'en') {
        return res.status(400).json({ message: "لغة غير صالحة" });
      }

      const updatedUser = await storage.updateUserLanguage(req.user.id, language);
      res.json(updatedUser);
    } catch (error) {
      console.error("خطأ في تحديث تفضيلات اللغة:", error);
      res.status(500).json({ message: "فشل تحديث تفضيلات اللغة" });
    }
  });

  // تحديث إعدادات الإشعارات (دعم PUT للتوافق مع التحديثات الجديدة)
  app.put("/api/user/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول." });
      }
      
      console.log('طلب تحديث إعدادات الإشعارات - PUT:', {
        userId: req.user.id,
        body: req.body
      });
      
      const userId = req.user.id;
      
      // إعداد بيانات التحديث لتتوافق مع بنية الجدول في قاعدة البيانات
      const notificationSettings = {
        emailNotifications: typeof req.body.emailNotifications !== 'undefined' ? req.body.emailNotifications : 
                         typeof req.body.allowEmailNotifications !== 'undefined' ? req.body.allowEmailNotifications : undefined,
        
        pushNotifications: typeof req.body.pushNotifications !== 'undefined' ? req.body.pushNotifications : 
                        typeof req.body.allowPushNotifications !== 'undefined' ? req.body.allowPushNotifications : undefined,
        
        signalAlerts: typeof req.body.signalAlerts !== 'undefined' ? req.body.signalAlerts : 
                   typeof req.body.receiveSignalAlerts !== 'undefined' ? req.body.receiveSignalAlerts : undefined,
        
        marketUpdates: typeof req.body.marketUpdates !== 'undefined' ? req.body.marketUpdates : 
                    typeof req.body.receiveMarketUpdates !== 'undefined' ? req.body.receiveMarketUpdates : undefined,
        
        accountAlerts: typeof req.body.accountAlerts !== 'undefined' ? req.body.accountAlerts : undefined,
        
        promotionalEmails: typeof req.body.promotionalEmails !== 'undefined' ? req.body.promotionalEmails : 
                        typeof req.body.receiveNewFeatures !== 'undefined' ? req.body.receiveNewFeatures : undefined,
      };
      
      // تنقية البيانات من القيم غير المحددة
      const cleanSettings: Record<string, any> = Object.entries(notificationSettings)
        .filter(([_key, value]) => value !== undefined)
        .reduce((obj: Record<string, any>, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
      
      console.log('تحديث إعدادات الإشعارات لقاعدة البيانات:', {
        userId,
        settings: cleanSettings
      });
      
      // التحقق من وجود إعدادات للمستخدم
      const existingSettings = await storage.getUserNotificationSettings(userId);
      
      let updatedSettings;
      
      if (!existingSettings) {
        console.log(`إنشاء إعدادات إشعارات جديدة للمستخدم ${userId}`);
        // إنشاء إعدادات جديدة إذا لم تكن موجودة
        
        // تعريف الإعدادات الافتراضية مع القيم المخصصة
        const defaultNotificationSettings: Record<string, any> = {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          signalAlerts: true,
          marketUpdates: true,
          accountAlerts: true,
          promotionalEmails: false
        };
        
        // دمج الإعدادات المخصصة مع الإعدادات الافتراضية
        const mergedSettings = {
          ...defaultNotificationSettings,
          ...cleanSettings
        };
        
        updatedSettings = await storage.createUserNotificationSettings(mergedSettings);
      } else {
        // تحديث الإعدادات الموجودة
        updatedSettings = await storage.updateUserNotificationSettings(userId, cleanSettings);
      }
      
      // إضافة مراقبة وجهة
      console.log('تم تحديث إعدادات الإشعارات بنجاح:', updatedSettings);
      
      res.json({
        ...updatedSettings,
        _serverTime: new Date().toISOString()
      });
    } catch (error) {
      console.error("خطأ في تحديث إعدادات الإشعارات:", error);
      res.status(500).json({ message: "فشل تحديث إعدادات الإشعارات" });
    }
  });
  
  // دعم PATCH للتوافق الخلفي
  app.patch("/api/user/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "غير مصرح. يرجى تسجيل الدخول." });
      }
      
      console.log('طلب تحديث إعدادات الإشعارات - PATCH:', {
        userId: req.user.id,
        body: req.body
      });
      
      const userId = req.user.id;
      
      // تحويل البيانات إلى التنسيق المناسب لقاعدة البيانات
      const notificationSettings: Partial<UserNotificationSettings> = {
        emailNotifications: req.body.emailNotifications || req.body.allowEmailNotifications,
        pushNotifications: req.body.pushNotifications || req.body.allowPushNotifications,
        signalAlerts: req.body.signalAlerts || req.body.receiveSignalAlerts,
        marketUpdates: req.body.marketUpdates || req.body.receiveMarketUpdates,
        accountAlerts: req.body.accountAlerts,
        promotionalEmails: req.body.promotionalEmails || req.body.receiveNewFeatures,
      };
      
      console.log('تحديث إعدادات الإشعارات لقاعدة البيانات:', {
        userId,
        settings: notificationSettings
      });
      
      // تحديث الإعدادات في قاعدة البيانات
      const updatedSettings = await storage.updateUserNotificationSettings(userId, notificationSettings);
      
      // إضافة مراقبة وجهة
      console.log('تم تحديث إعدادات الإشعارات بنجاح:', updatedSettings);
      
      res.json({
        success: true,
        ...updatedSettings
      });
    } catch (error) {
      console.error("خطأ في تحديث إعدادات الإشعارات:", error);
      res.status(500).json({ message: "فشل تحديث إعدادات الإشعارات" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
