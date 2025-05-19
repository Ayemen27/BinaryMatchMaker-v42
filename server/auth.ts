import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // استخدام متغير البيئة SESSION_SECRET أو إنشاء قيمة افتراضية
  const sessionSecret = process.env.SESSION_SECRET || 'binary-signals-app-secret-key';
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Username already exists", 
          error: "username_exists" 
        });
      }

      // إنشاء المستخدم
      const user = await storage.createUser({
        ...req.body,
        language: req.body.language || 'ar', // استخدام اللغة العربية افتراضياً
        subscriptionLevel: 'free', // بدء المستخدم بالمستوى المجاني
        isActive: true,
        password: await hashPassword(req.body.password),
      });

      // إنشاء إعدادات المستخدم
      await storage.createUserSettings({
        userId: user.id,
        theme: 'dark',
        defaultAsset: 'BTC/USDT',
        defaultTimeframe: '1h',
        chartType: 'candlestick',
        showTradingTips: true,
        autoRefreshData: true,
        refreshInterval: 60,
        useAiForSignals: true
      });

      // إنشاء إعدادات الإشعارات
      await storage.createUserNotificationSettings({
        userId: user.id,
        emailNotifications: true,
        pushNotifications: true,
        signalAlerts: true,
        marketUpdates: true,
        accountAlerts: true,
        promotionalEmails: false
      });

      // إنشاء اشتراك للمستخدم
      await storage.createUserSubscription({
        userId: user.id,
        type: 'free',
        isActive: true,
        dailySignalLimit: 5,
        startDate: new Date()
      });

      // تسجيل دخول المستخدم تلقائياً
      req.login(user, (err) => {
        if (err) return next(err);
        
        // تحديث آخر دخول للمستخدم
        storage.updateUserLastLogin(user.id).catch(console.error);
        
        // إرجاع بيانات المستخدم
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("خطأ في تسجيل المستخدم:", error);
      res.status(500).json({ 
        message: "Failed to register user", 
        error: "registration_error" 
      });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
