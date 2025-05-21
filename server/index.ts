// تحميل متغيرات البيئة من ملف .env
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runAutoRestore } from "./auto-restore-service";
import { initializeDatabase } from "./backup-manager";
import { TelegramBotService } from "./services/telegram-bot";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // تهيئة قاعدة البيانات (إنشاء الجداول، استرجاع البيانات، إنشاء المستخدم الافتراضي)
  // سنقوم بمعالجة استرجاع البيانات ضمن عملية التهيئة
  await initializeDatabase();
  
  // تشغيل خدمة الاسترجاع التلقائي للبيانات (إذا لزم الأمر)
  await runAutoRestore();
  
  const server = await registerRoutes(app);
  
  // تسجيل وتفعيل خدمة بوت تلجرام
  const telegramBot = new TelegramBotService();
  
  // استخدام عنوان URL الصحيح لـ Replit
  // عناوين webhook يجب أن تكون HTTPS دائمًا لتلجرام
  const baseUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://d3069587-0c8f-49bd-9cc4-74d6904d29a8-00-3k7bgesw6ce81.sisko.replit.dev';
  
  console.log(`[خادم] تسجيل البوت في العنوان: ${baseUrl}`);
  telegramBot.registerWebhook(app, baseUrl);
  console.log(`[خدمة البوت] تم تسجيل خدمة بوت تلجرام مع العنوان الأساسي: ${baseUrl}`);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('خطأ في الخادم:', err);
    // لا نعيد رمي الخطأ - هذا يسبب انهيار الخادم
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
