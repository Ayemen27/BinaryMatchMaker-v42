import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { db } from "./db";
import createMemoryStore from "memorystore";

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
  
  // استخدام إعدادات جلسة بسيطة جداً
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // استخدام المخزن مباشرة للبحث عن المستخدم
        const user = await storage.getUserByUsername(username);
        
        if (!user || !(await comparePasswords(password, user.password))) {
          console.log(`محاولة تسجيل دخول فاشلة: ${username}`);
          return done(null, false);
        } else {
          console.log(`تسجيل دخول ناجح: ${username}`);
          return done(null, user);
        }
      } catch (error) {
        console.error('خطأ في مصادقة المستخدم:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      // استخدام استعلام مباشر للحصول على المستخدم بواسطة المعرف
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result.length > 0 ? result[0] : null;
      
      if (!user) {
        console.log(`لم يتم العثور على المستخدم برقم ${id}`);
        return done(null, false);
      }
      
      console.log(`تم استرجاع بيانات المستخدم ${user.username} (${id})`);
      return done(null, user);
    } catch (error) {
      console.error("خطأ في استعادة بيانات المستخدم من الجلسة:", error);
      return done(error);
    }
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
        language: req.body.language || 'en', // استخدام اللغة الإنجليزية افتراضياً
        subscriptionLevel: 'free', // بدء المستخدم بالمستوى المجاني
        isActive: true,
        password: await hashPassword(req.body.password),
      });

      // إنشاء إعدادات المستخدم (التحقق من عدم وجودها أولاً)
      const existingSettings = await storage.getUserSettings(user.id);
      if (!existingSettings) {
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
      }

      // إنشاء إعدادات الإشعارات (التحقق من عدم وجودها أولاً)
      const existingNotificationSettings = await storage.getUserNotificationSettings(user.id);
      if (!existingNotificationSettings) {
        await storage.createUserNotificationSettings({
          userId: user.id,
          emailNotifications: true,
          pushNotifications: true,
          signalAlerts: true,
          marketUpdates: true,
          accountAlerts: true,
          promotionalEmails: false
        });
      }

      // إنشاء اشتراك للمستخدم (التحقق من عدم وجوده أولاً)
      const existingSubscription = await storage.getUserSubscription(user.id);
      if (!existingSubscription) {
        await storage.createUserSubscription({
          userId: user.id,
          type: 'free',
          isActive: true,
          dailySignalLimit: 3, // تحديد عدد الإشارات المسموح بها يومياً للمستخدم المجاني بـ 3
          startDate: new Date()
        });
      }

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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("خطأ أثناء المصادقة:", err);
        return res.status(500).json({ 
          message: "حدث خطأ في النظام أثناء محاولة تسجيل الدخول", 
          error: "auth_system_error" 
        });
      }
      
      if (!user) {
        // تحقق ما إذا كان اسم المستخدم موجودًا
        storage.getUserByUsername(req.body.username)
          .then(existingUser => {
            if (!existingUser) {
              return res.status(401).json({ 
                message: "اسم المستخدم غير موجود", 
                error: "username_not_found" 
              });
            } else {
              return res.status(401).json({ 
                message: "كلمة المرور غير صحيحة", 
                error: "password_incorrect" 
              });
            }
          })
          .catch(error => {
            console.error("خطأ في التحقق من اسم المستخدم:", error);
            return res.status(401).json({ 
              message: "بيانات تسجيل الدخول غير صحيحة", 
              error: "invalid_credentials" 
            });
          });
        return;
      }
      
      // إذا نجحت المصادقة، قم بتسجيل دخول المستخدم
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("خطأ في تسجيل الدخول:", loginErr);
          return res.status(500).json({ 
            message: "حدث خطأ أثناء تسجيل الدخول", 
            error: "login_error" 
          });
        }
        
        try {
          // تحديث وقت آخر تسجيل دخول للمستخدم
          await storage.updateUserLastLogin(user.id);
          
          // تسجيل حدث تسجيل الدخول
          console.log(`تم تسجيل دخول المستخدم: ${user.username} (${user.id}) بنجاح`);
          
          // إرجاع بيانات المستخدم
          res.status(200).json(user);
        } catch (error) {
          console.error("خطأ في تحديث وقت آخر تسجيل دخول:", error);
          // إرجاع بيانات المستخدم حتى لو فشل تحديث وقت آخر تسجيل دخول
          res.status(200).json(user);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // تسجيل حدث تسجيل الخروج إذا كان المستخدم مسجل دخوله
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const username = req.user.username;
      
      console.log(`تسجيل خروج المستخدم: ${username} (${userId})`);
      
      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    } else {
      // المستخدم غير مسجل دخوله أصلاً
      res.sendStatus(200);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
