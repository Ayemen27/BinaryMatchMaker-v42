import express, { Request, Response } from "express";
import { openAIService } from "../services/openai-service";
import { storage } from "../storage";
import { z } from "zod";
import { logger } from "../services/logger";
import { getAIErrorMessage, SupportedLanguages } from "../i18n/translations";

// إنشاء موجه الطرق
const router = express.Router();

// الحد الأقصى للإشارات اليومية للمستخدم المجاني
const FREE_USER_DAILY_SIGNAL_LIMIT = 3;

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

    const { platform, pair, timeframe, useAI } = result.data;

    // سجل بداية طلب توليد الإشارة
    logger.info("SignalGenerator", "طلب جديد لتوليد إشارة", { 
      userId: req.user?.id, 
      platform, 
      pair, 
      timeframe,
      useAI
    });

    // التحقق من حدود الاشتراك المجاني
    const user = req.user;
    if (user?.subscriptionLevel === 'free') {
      // الحصول على عدد الإشارات المولدة اليوم من هذا المستخدم
      const dailyUsage = await storage.getUserSignalUsageToday(user.id);
      
      // التحقق من الحد اليومي للمستخدم المجاني
      if (dailyUsage >= FREE_USER_DAILY_SIGNAL_LIMIT) {
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
    
    // توليد الإشارة باستخدام الذكاء الاصطناعي أو الخوارزميات التقليدية حسب اختيار المستخدم
    const userId = req.user?.id;
    
    // تحديث إعدادات المستخدم إذا كان مسجلاً دخوله
    if (userId) {
      try {
        const userSettings = await storage.getUserSettings(userId);
        
        if (userSettings) {
          // تحديث إعدادات استخدام الذكاء الاصطناعي بناءً على الاختيار الحالي
          await storage.updateUserSettings(userId, {
            useAiForSignals: useAI
          });
          
          // تحديث السجلات
          logger.info("SignalGenerator", "تم تحديث إعدادات الذكاء الاصطناعي للمستخدم", { 
            userId, 
            useAiForSignals: useAI 
          });
        }
      } catch (settingsError) {
        // تسجيل الخطأ ولكن الاستمرار في توليد الإشارة
        logger.warn("SignalGenerator", "فشل تحديث إعدادات المستخدم", { 
          userId,
          error: settingsError instanceof Error ? settingsError.message : String(settingsError)
        });
      }
    }
    
    // إرسال طلب توليد الإشارة مع تحديد طريقة التوليد
    const signal = await openAIService.generateTradingSignal(platform, pair, timeframe, userId, !useAI);

    // تتبع استخدام الإشارة في سجل المستخدم
    if (userId) {
      await storage.trackSignalUsage(userId, 'generated');
      
      // إضافة الإشارة إلى قائمة إشارات المستخدم
      await storage.addSignalToUser(userId, signal.id);
    }

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
    
    // الحصول على لغة المستخدم المفضلة
    let userLanguage: SupportedLanguages = 'ar';
    
    // محاولة الحصول على لغة المستخدم من كائن المستخدم
    if (req.user) {
      try {
        const user = await storage.getUser(req.user.id);
        if (user && user.language) {
          // التحقق من أن اللغة مدعومة
          userLanguage = (user.language === 'en' ? 'en' : 'ar') as SupportedLanguages;
        }
      } catch (error) {
        logger.warn("SignalGenerator", "فشل في الحصول على لغة المستخدم", { userId: req.user.id });
      }
    }
    
    // تحديد نوع الخطأ
    let errorType = 'generic_error';
    
    if (errorMessage.includes("تم تجاوز الحد المسموح") || errorMessage.includes("quota")) {
      errorType = 'quota_exceeded';
      return res.status(429).json(getAIErrorMessage(errorType, userLanguage));
    } else if (errorMessage.includes("المفتاح غير صالح") || errorMessage.includes("key")) {
      errorType = 'invalid_api_key';
      return res.status(403).json(getAIErrorMessage(errorType, userLanguage));
    } else if (errorMessage.includes("تجاوز الحد الأقصى") || errorMessage.includes("rate limit")) {
      errorType = 'rate_limit';
      return res.status(429).json(getAIErrorMessage(errorType, userLanguage));
    } else if (errorMessage.includes("غير متاحة") || errorMessage.includes("service")) {
      errorType = 'service_unavailable';
      return res.status(503).json(getAIErrorMessage(errorType, userLanguage));
    }
    
    // أخطاء أخرى
    return res.status(500).json(getAIErrorMessage(errorType, userLanguage));
  }
});

// طريقة API للحصول على معلومات استخدام الإشارات للمستخدم
router.get("/usage-info", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    const user = req.user;
    const userId = user.id;
    
    // المعلومات الافتراضية
    const usageInfo = {
      subscriptionLevel: user.subscriptionLevel || 'free',
      dailyLimit: FREE_USER_DAILY_SIGNAL_LIMIT, // الحد الافتراضي للمستخدم المجاني
      usedToday: 0,
      remainingToday: FREE_USER_DAILY_SIGNAL_LIMIT
    };
    
    // إذا كان المستخدم مدفوع، قم بتحديث حد الإشارات اليومي
    if (user.subscriptionLevel === 'premium') {
      usageInfo.dailyLimit = 50; // مثال: 50 إشارة للمستوى المتميز
      usageInfo.remainingToday = 50;
    } else if (user.subscriptionLevel === 'pro') {
      usageInfo.dailyLimit = 100; // مثال: 100 إشارة للمستوى الاحترافي
      usageInfo.remainingToday = 100;
    }
    
    // الحصول على عدد الإشارات المستخدمة اليوم
    const dailyUsage = await storage.getUserSignalUsageToday(userId);
    usageInfo.usedToday = dailyUsage;
    
    // حساب الإشارات المتبقية
    usageInfo.remainingToday = Math.max(0, usageInfo.dailyLimit - dailyUsage);
    
    return res.json(usageInfo);
  } catch (error) {
    console.error("خطأ في الحصول على معلومات استخدام الإشارات:", error);
    return res.status(500).json({ error: "خطأ في معالجة الطلب" });
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

    // استخراج خيار استخدام الذكاء الاصطناعي
    const { useAI = true } = req.body;
    
    // تحليل اتجاه السوق باستخدام الذكاء الاصطناعي أو الخوارزميات التقليدية
    const userId = req.user?.id;
    const analysis = await openAIService.analyzeMarketTrend(pair, userId, !useAI);
    
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
    
    // معالجة رسائل الخطأ المختلفة من OpenAI بطريقة أكثر تفصيلاً
    if (errorMessage.includes("تم تجاوز الحد المسموح")) {
      return res.status(429).json({ 
        error: "تجاوز الحد المسموح", 
        message: "تم تجاوز الحد المسموح لاستخدام الذكاء الاصطناعي في تحليل السوق.",
        solution: "يمكنك تعطيل خيار الذكاء الاصطناعي والاستمرار باستخدام التحليل التقليدي" 
      });
    } else if (errorMessage.includes("المفتاح غير صالح") || errorMessage.includes("مفتاح الذكاء الاصطناعي")) {
      return res.status(403).json({ 
        error: "مشكلة في مفتاح API", 
        message: "المفتاح المستخدم للذكاء الاصطناعي غير صالح أو منتهي الصلاحية.",
        solution: "يرجى التواصل مع الدعم الفني أو تعطيل خيار الذكاء الاصطناعي مؤقتاً"
      });
    } else if (errorMessage.includes("تجاوز الحد الأقصى") || errorMessage.includes("rate limit")) {
      return res.status(429).json({ 
        error: "تجاوز معدل الاستخدام", 
        message: "تم تجاوز الحد الأقصى لعدد طلبات التحليل المسموح بها.",
        solution: "يرجى المحاولة لاحقاً أو استخدام التحليل التقليدي" 
      });
    } else if (errorMessage.includes("غير متاحة حاليًا") || errorMessage.includes("خدمة الذكاء الاصطناعي")) {
      return res.status(503).json({ 
        error: "خدمة غير متاحة", 
        message: "خدمة تحليل السوق غير متاحة حالياً. يرجى المحاولة لاحقاً.",
        solution: "يمكنك تعطيل خيار الذكاء الاصطناعي مؤقتاً واستخدام التحليل التقليدي" 
      });
    }
    
    // أخطاء أخرى
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحليل اتجاه السوق", 
      message: "تعذر إكمال عملية تحليل السوق. يرجى المحاولة مرة أخرى لاحقاً.",
      details: errorMessage,
      solution: "يمكنك تجربة تعطيل خيار الذكاء الاصطناعي واستخدام التحليل التقليدي بدلاً من ذلك"
    });
  }
});

export default router;