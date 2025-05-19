import OpenAI from "openai";
import dotenv from "dotenv";
import { Signal, InsertSignal } from "@shared/schema";
import { storage } from "../storage";

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
  async generateTradingSignal(platform: string, pair: string, timeframe: string, userId?: number): Promise<Signal> {
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
      
      // إنشاء بيانات الإشارة للتخزين في قاعدة البيانات
      const signalToInsert: InsertSignal = {
        asset: signalData.asset,
        type: signalData.type,
        entryPrice: signalData.entryPrice,
        targetPrice: signalData.targetPrice,
        stopLoss: signalData.stopLoss,
        accuracy: signalData.accuracy,
        time: signalData.time,
        status: 'active',
        indicators: signalData.indicators,
        platform: platform,
        timeframe: timeframe,
        reason: signalData.reason,
        createdBy: userId || null,
        isPublic: true,
        analysis: {
          reasoning: signalData.reason,
          potentialProfit: ((parseFloat(signalData.targetPrice) - parseFloat(signalData.entryPrice)) / parseFloat(signalData.entryPrice) * 100).toFixed(2) + '%',
          riskRewardRatio: ((parseFloat(signalData.targetPrice) - parseFloat(signalData.entryPrice)) / Math.abs(parseFloat(signalData.entryPrice) - parseFloat(signalData.stopLoss))).toFixed(2),
        }
      };
      
      // حفظ الإشارة في قاعدة البيانات
      const signal = await storage.createSignal(signalToInsert);
      
      // إذا كان هناك معرف مستخدم، قم بتعيين الإشارة للمستخدم وتتبع الاستخدام
      if (userId) {
        // تتبع استخدام المستخدم للإشارات
        await storage.trackSignalUsage(userId, 'generated');
        
        // ربط الإشارة بالمستخدم
        await storage.addSignalToUser(userId, signal.id);
        
        // إنشاء إشعار للمستخدم
        await storage.createNotification({
          userId,
          type: 'signal',
          title: 'تم إنشاء إشارة جديدة',
          message: `تم إنشاء إشارة ${signalData.type === 'buy' ? 'شراء' : 'بيع'} جديدة لـ ${pair} على الإطار الزمني ${timeframe}`,
          relatedId: signal.id
        });
      }

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
  async analyzeMarketTrend(pair: string, userId?: number): Promise<{
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

      const analysisData = JSON.parse(content);
      
      // تحديد سعر أساسي قريب من الواقع للتخزين في قاعدة البيانات
      let basePrice = 0;
      if (pair.startsWith('BTC')) {
        basePrice = 37500 + Math.floor(Math.random() * 2000);
      } else if (pair.startsWith('ETH')) {
        basePrice = 2200 + Math.floor(Math.random() * 200);
      } else if (pair.startsWith('SOL')) {
        basePrice = 140 + Math.floor(Math.random() * 20);
      } else if (pair.startsWith('XRP')) {
        basePrice = 0.5 + Math.random() * 0.2;
      } else {
        basePrice = 100 + Math.floor(Math.random() * 50);
      }
      
      // حفظ بيانات السوق في قاعدة البيانات
      await storage.saveMarketData({
        asset: pair,
        price: basePrice.toFixed(2),
        change24h: (analysisData.trend === 'صعودي' ? '+' : analysisData.trend === 'هبوطي' ? '-' : '') + (Math.random() * 5).toFixed(2) + '%',
        high24h: (basePrice * 1.02).toFixed(2),
        low24h: (basePrice * 0.98).toFixed(2),
        volume24h: (Math.random() * 1000000 + 500000).toFixed(0),
        marketCap: (basePrice * (Math.random() * 1000000 + 5000000)).toFixed(0),
        dataSource: 'AI Analysis'
      });
      
      // إذا كان هناك معرف مستخدم، قم بتتبع استخدام التحليل
      if (userId) {
        // تتبع استخدام المستخدم للتحليلات
        await storage.trackSignalUsage(userId, 'analyzed');
        
        // إنشاء إشعار للمستخدم
        await storage.createNotification({
          userId,
          type: 'market',
          title: 'تحليل سوق جديد',
          message: `تم إنجاز تحليل سوق لـ ${pair} - الاتجاه: ${analysisData.trend}`,
          relatedId: null
        });
      }

      return analysisData;
    } catch (error) {
      console.error("حدث خطأ أثناء تحليل اتجاه السوق:", error);
      throw new Error("فشل في تحليل اتجاه السوق. يرجى المحاولة مرة أخرى.");
    }
  }
}

// تصدير مثيل واحد من الخدمة للاستخدام في جميع أنحاء التطبيق
export const openAIService = new OpenAIService();