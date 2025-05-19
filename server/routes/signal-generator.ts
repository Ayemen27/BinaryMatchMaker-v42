import express, { Request, Response } from "express";
import { openAIService } from "../services/openai-service";
import { storage } from "../storage";
import { z } from "zod";

// إنشاء موجه الطرق
const router = express.Router();

// مخطط التحقق من صحة البيانات
const generateSignalSchema = z.object({
  platform: z.string().min(1, "المنصة مطلوبة"),
  pair: z.string().min(1, "زوج التداول مطلوب"),
  timeframe: z.string().min(1, "الإطار الزمني مطلوب"),
});

type GenerateSignalRequest = z.infer<typeof generateSignalSchema>;

// طريقة API لتوليد إشارة تداول
router.post("/generate", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const result = generateSignalSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "بيانات غير صالحة", 
        details: result.error.errors 
      });
    }

    const { platform, pair, timeframe } = result.data;

    // التحقق من حدود الاشتراك المجاني
    const user = req.user;
    if (user?.subscriptionLevel === 'free') {
      // الحصول على عدد الإشارات المولدة اليوم من هذا المستخدم
      // هذا يتطلب إضافة بعض الوظائف في storage لتتبع الإشارات المولدة يومياً
      // سنجعله يعمل مؤقتاً بدون هذا التحقق
      // TODO: تنفيذ التحقق الحقيقي من حدود الاشتراك المجاني
    }
    
    // توليد الإشارة باستخدام الذكاء الاصطناعي
    const signal = await openAIService.generateTradingSignal(platform, pair, timeframe);
    
    // حفظ الإشارة في قاعدة البيانات
    const savedSignal = await storage.createSignal({
      asset: signal.asset,
      type: signal.type,
      entryPrice: signal.entryPrice,
      targetPrice: signal.targetPrice,
      stopLoss: signal.stopLoss,
      accuracy: signal.accuracy,
      time: signal.time,
      status: 'active',
      indicators: signal.indicators,
    });

    // إرجاع الإشارة المولدة
    return res.status(201).json(savedSignal);
  } catch (error) {
    console.error("خطأ في توليد الإشارة:", error);
    return res.status(500).json({ 
      error: "حدث خطأ أثناء توليد الإشارة", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

// طريقة API لتحليل اتجاه السوق
router.post("/analyze-trend", async (req: Request, res: Response) => {
  try {
    // التحقق من أن المستخدم مسجل دخوله
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول." });
    }

    // التحقق من صحة البيانات المرسلة
    const { pair } = req.body;
    if (!pair) {
      return res.status(400).json({ error: "زوج التداول مطلوب" });
    }

    // تحليل اتجاه السوق باستخدام الذكاء الاصطناعي
    const analysis = await openAIService.analyzeMarketTrend(pair);
    
    // إرجاع نتيجة التحليل
    return res.status(200).json(analysis);
  } catch (error) {
    console.error("خطأ في تحليل اتجاه السوق:", error);
    return res.status(500).json({ 
      error: "حدث خطأ أثناء تحليل اتجاه السوق", 
      message: error instanceof Error ? error.message : "خطأ غير معروف" 
    });
  }
});

export default router;