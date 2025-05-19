import OpenAI from "openai";
import dotenv from "dotenv";
import { Signal } from "@shared/schema";

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

// التحقق من وجود مفتاح API
if (!process.env.OPENAI_API_KEY) {
  console.error("مفتاح API الخاص بـ OpenAI غير متوفر. يرجى التحقق من ملف .env");
}

// إنشاء مثيل من OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

/**
 * خدمة توليد الإشارات باستخدام الذكاء الاصطناعي
 */
export class OpenAIService {
  /**
   * توليد إشارة تداول للخيارات الثنائية
   * @param platform منصة التداول
   * @param pair زوج العملة
   * @param timeframe الإطار الزمني
   */
  async generateTradingSignal(platform: string, pair: string, timeframe: string): Promise<Signal> {
    try {
      // بناء محتوى المطلب للذكاء الاصطناعي
      const prompt = `
      أنت محلل مالي خبير متخصص في توليد إشارات تداول للخيارات الثنائية (ثنائية الاتجاه) بناءً على التحليل الفني.
      
      قم بتوليد إشارة تداول للبيانات التالية:
      - المنصة: ${platform}
      - زوج التداول: ${pair}
      - الإطار الزمني: ${timeframe}
      
      استخدم المؤشرات الفنية المناسبة مثل RSI و MACD و Bollinger Bands للتحليل.
      قم بإرجاع النتيجة بتنسيق JSON حسب المثال التالي، مع قيم واقعية ودقيقة لأسعار الدخول والهدف ووقف الخسارة:
      
      {
        "type": "buy", // أو "sell"
        "asset": "${pair}",
        "entryPrice": "37245.50", // سعر الدخول المناسب
        "targetPrice": "37500.25", // السعر المستهدف
        "stopLoss": "37100.75", // سعر وقف الخسارة
        "accuracy": 92, // دقة الإشارة (90-99)
        "time": "14:30", // وقت الإشارة بتنسيق 24 ساعة
        "indicators": ["RSI", "MACD"], // المؤشرات المستخدمة
        "reason": "ملخص موجز لسبب الإشارة"
      }
      
      ملاحظة: ضمن دقة إشارة مرتفعة (أكثر من 90%) وقدم أسعار دخول وهدف ووقف خسارة واقعية ومنطقية للزوج المحدد.
      `;

      // استدعاء واجهة برمجة ChatGPT
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // استخدام أحدث نموذج
        messages: [
          {
            role: "system",
            content: "أنت محلل مالي خبير متخصص في توليد إشارات تداول دقيقة للخيارات الثنائية."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5, // درجة إبداعية متوسطة
        response_format: { type: "json_object" }, // تنسيق الرد كـ JSON
      });

      // تحويل النص إلى كائن JSON
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("لم يتم توليد محتوى من الذكاء الاصطناعي");
      }

      const signalData = JSON.parse(content);
      
      // إنشاء كائن الإشارة
      const signal: Signal = {
        id: Date.now(), // سيتم استبداله عند الإدراج في قاعدة البيانات
        asset: signalData.asset,
        type: signalData.type,
        entryPrice: signalData.entryPrice,
        targetPrice: signalData.targetPrice,
        stopLoss: signalData.stopLoss,
        accuracy: signalData.accuracy,
        time: signalData.time,
        status: 'active',
        indicators: signalData.indicators,
        createdAt: new Date(),
        result: null
      };

      return signal;
    } catch (error) {
      console.error("حدث خطأ أثناء توليد إشارة التداول:", error);
      throw new Error("فشل في توليد إشارة التداول. يرجى المحاولة مرة أخرى.");
    }
  }
  
  /**
   * تحليل الاتجاهات السوقية لزوج معين
   * @param pair زوج العملة
   */
  async analyzeMarketTrend(pair: string): Promise<{
    trend: "صعودي" | "هبوطي" | "متذبذب";
    strength: number;
    summary: string;
    keyLevels: { support: string[]; resistance: string[] };
  }> {
    try {
      const prompt = `
      قم بتحليل الاتجاه السوقي الحالي لـ ${pair}.
      
      استخدم معرفتك بالأسواق المالية والتحليل الفني لتقديم تحليل شامل.
      
      أرجع النتيجة بتنسيق JSON كما يلي:
      
      {
        "trend": "صعودي", // "صعودي" أو "هبوطي" أو "متذبذب"
        "strength": 75, // قوة الاتجاه من 0 إلى 100
        "summary": "ملخص موجز عن الاتجاه الحالي",
        "keyLevels": {
          "support": ["35000", "34500"], // مستويات الدعم الرئيسية
          "resistance": ["38000", "39000"] // مستويات المقاومة الرئيسية
        }
      }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "أنت محلل فني خبير في الأسواق المالية."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("لم يتم توليد محتوى من الذكاء الاصطناعي");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("حدث خطأ أثناء تحليل اتجاه السوق:", error);
      throw new Error("فشل في تحليل اتجاه السوق. يرجى المحاولة مرة أخرى.");
    }
  }
}

// تصدير مثيل واحد من الخدمة للاستخدام في جميع أنحاء التطبيق
export const openAIService = new OpenAIService();