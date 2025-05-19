import express, { Request, Response } from "express";
import { openAIService } from "../services/openai-service";
import { storage } from "../storage";
import { z } from "zod";
import { logger } from "../services/logger";

// إنشاء موجه الطرق
const router = express.Router();

// مخطط التحقق من صحة البيانات
const generateSignalSchema = z.object({
  platform: z.string().min(1, "المنصة مطلوبة"),
  pair: z.string().min(1, "زوج التداول مطلوب"),
  timeframe: z.string().min(1, "الإطار الزمني مطلوب"),
  useAI: z.boolean().optional().default(true), // خيار استخدام الذكاء الاصطناعي
});

type GenerateSignalRequest = z.infer<typeof generateSignalSchema>;

// طريقة API لتوليد إشارة تداول
router.post("/generate", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("SignalGenerator", "محاولة وصول غير مصرح بها", { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = generateSignalSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn("SignalGenerator", "بيانات طلب غير صالحة", { 
        errors: result.error.errors,
        userId: req.user?.id 
      });
      return res.status(400).json({ 
        error: "بيانات غير صالحة", 
        details: result.error.errors 
      });
    }

    const { platform, pair, timeframe } = result.data;

    // سجل بداية طلب توليد الإشارة
    logger.info("SignalGenerator", "طلب جديد لتوليد إشارة", { 
      userId: req.user?.id, 
      platform, 
      pair, 
      timeframe 
    });

    // التحقق من حدود الاشتراك المجاني
    const user = req.user;
    if (user?.subscriptionLevel === 'free') {
      // الحصول على عدد الإشارات المولدة اليوم من هذا المستخدم
      const dailyUsage = await storage.getUserSignalUsageToday(user.id);
      
      // التحقق من الحد اليومي للمستخدم المجاني (3 إشارات يومياً)
      if (dailyUsage >= 3) {
        logger.warn("SignalGenerator", "تجاوز حد الاستخدام المجاني", { 
          userId: user.id, 
          dailyUsage 
        });
        return res.status(403).json({ 
          error: "تم تجاوز الحد اليومي", 
          message: "لقد وصلت إلى الحد اليومي لتوليد الإشارات المجانية. يرجى الترقية للحصول على المزيد من الإشارات." 
        });
      }
    }
    
    // توليد الإشارة باستخدام الذكاء الاصطناعي ومعرف المستخدم لربطها به
    const userId = req.user?.id;
    const signal = await openAIService.generateTradingSignal(platform, pair, timeframe, userId);

    // تسجيل نجاح العملية
    logger.info("SignalGenerator", "تم توليد الإشارة بنجاح", { 
      userId, 
      signalId: signal.id 
    });

    // إرجاع الإشارة المولدة
    return res.status(201).json(signal);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    
    // تسجيل خطأ مفصل في السجلات
    logger.error("SignalGenerator", error instanceof Error ? error : new Error(String(error)), { 
      userId: req.user?.id,
      requestBody: req.body 
    });
    
    // رسالة مخصصة للمستخدم إذا كان خطأ من OpenAI
    if (errorMessage.includes("مشكلة في خدمة الذكاء الاصطناعي")) {
      return res.status(503).json({ 
        error: "خدمة غير متاحة", 
        message: "خدمة توليد الإشارات غير متاحة حالياً. يرجى المحاولة لاحقاً أو الاتصال بالدعم الفني." 
      });
    }
    
    // أخطاء أخرى
    return res.status(500).json({ 
      error: "حدث خطأ أثناء توليد الإشارة", 
      message: errorMessage
    });
  }
});

// طريقة API لتحليل اتجاه السوق
router.post("/analyze-trend", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      logger.warn("MarketAnalysis", "محاولة وصول غير مصرح بها", { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const { pair } = req.body;
    if (!pair) {
      logger.warn("MarketAnalysis", "بيانات طلب غير صالحة - زوج التداول مفقود", { 
        userId: req.user?.id,
        body: req.body
      });
      return res.status(400).json({ error: "زوج التداول مطلوب" });
    }

    // سجل بداية طلب تحليل السوق
    logger.info("MarketAnalysis", "طلب جديد لتحليل اتجاه السوق", { 
      userId: req.user?.id, 
      pair 
    });

    // التحقق من حدود الاشتراك المجاني
    const user = req.user;
    if (user?.subscriptionLevel === 'free') {
      // الحصول على عدد التحليلات المطلوبة اليوم من هذا المستخدم
      const dailyUsage = await storage.getUserSignalUsageToday(user.id);
      
      // التحقق من الحد اليومي للمستخدم المجاني (3 تحليلات يومياً)
      if (dailyUsage >= 3) {
        logger.warn("MarketAnalysis", "تجاوز حد الاستخدام المجاني", { 
          userId: user.id, 
          dailyUsage 
        });
        return res.status(403).json({ 
          error: "تم تجاوز الحد اليومي", 
          message: "لقد وصلت إلى الحد اليومي لتحليلات السوق المجانية. يرجى الترقية للحصول على المزيد من التحليلات." 
        });
      }
    }

    // تحليل اتجاه السوق باستخدام الذكاء الاصطناعي
    const userId = req.user?.id;
    const analysis = await openAIService.analyzeMarketTrend(pair, userId);
    
    // تسجيل نجاح العملية
    logger.info("MarketAnalysis", "تم تحليل اتجاه السوق بنجاح", { 
      userId, 
      pair 
    });
    
    // إرجاع نتيجة التحليل
    return res.status(200).json(analysis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    
    // تسجيل خطأ مفصل في السجلات
    logger.error("MarketAnalysis", error instanceof Error ? error : new Error(String(error)), { 
      userId: req.user?.id,
      pair: req.body?.pair 
    });
    
    // رسالة مخصصة للمستخدم إذا كان خطأ من OpenAI
    if (errorMessage.includes("مشكلة في خدمة الذكاء الاصطناعي")) {
      return res.status(503).json({ 
        error: "خدمة غير متاحة", 
        message: "خدمة تحليل السوق غير متاحة حالياً. يرجى المحاولة لاحقاً أو الاتصال بالدعم الفني." 
      });
    }
    
    // أخطاء أخرى
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحليل اتجاه السوق", 
      message: errorMessage 
    });
  }
});

export default router;