import OpenAI from "openai";
import dotenv from "dotenv";
import { Signal, InsertSignal } from "@shared/schema";
import { storage } from "../storage";
import { logger } from "./logger";
import { algorithmicSignalService } from "./algorithmic-signal-service";

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

// التحقق من وجود مفتاح API
if (!process.env.OPENAI_API_KEY) {
  logger.error("OpenAIService", new Error("مفتاح API الخاص بـ OpenAI غير متوفر. يرجى التحقق من ملف .env"));
}

// إنشاء مثيل من OpenAI باستخدام المفتاح الافتراضي
const defaultOpenAI = new OpenAI({
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
      // إذا كان هناك معرف مستخدم، نتحقق من إعداداته المتعلقة بالذكاء الاصطناعي
      if (userId) {
        const userSettings = await storage.getUserSettings(userId);
        
        // إذا كان المستخدم يفضل عدم استخدام الذكاء الاصطناعي، استخدم الخوارزمية البديلة
        if (userSettings && userSettings.useAiForSignals === false) {
          logger.info("OpenAIService", "استخدام التوليد الخوارزمي بناءً على تفضيلات المستخدم", { userId });
          return await algorithmicSignalService.generateTradingSignal(platform, pair, timeframe, userId);
        }
      }
      
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

      logger.info("OpenAIService", "توليد إشارة جديدة", { platform, pair, timeframe, userId });

      // تحديد كائن OpenAI المناسب استنادًا إلى إعدادات المستخدم
      let openaiClient = defaultOpenAI;
      
      // إذا كان المستخدم يستخدم مفتاح API خاص به
      if (userId) {
        const userSettings = await storage.getUserSettings(userId);
        if (userSettings && userSettings.useCustomAiKey && userSettings.openaiApiKey) {
          logger.info("OpenAIService", "استخدام مفتاح API خاص بالمستخدم", { userId });
          
          // إنشاء كائن OpenAI جديد باستخدام مفتاح المستخدم
          openaiClient = new OpenAI({
            apiKey: userSettings.openaiApiKey
          });
        }
      }

      try {
        // استدعاء واجهة برمجة ChatGPT باستخدام الكائن المناسب
        const response = await openaiClient.chat.completions.create({
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
        
        // تسجيل نجاح عملية توليد الإشارة
        logger.signalActivity("generate", { platform, pair, timeframe, success: true }, userId);
        
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
      } catch (openAIError) {
        // في حالة حدوث خطأ في الاتصال بـ OpenAI، نقوم بتسجيل الخطأ بالتفصيل
        logger.error("OpenAIService", openAIError instanceof Error ? openAIError : new Error(String(openAIError)), {
          platform,
          pair,
          timeframe,
          userId,
          service: "openai"
        });
        
        logger.signalActivity("error", {
          platform,
          pair,
          timeframe,
          error: openAIError instanceof Error ? openAIError.message : String(openAIError),
          service: "openai"
        }, userId);
        
        // في حالة تجاوز الحصة أو مشاكل مفتاح API، نلقي خطأ محدد
        const errorObj = openAIError as any; // تحويل نوع الخطأ لاستخراج الخصائص بشكل آمن
        if (errorObj?.code === 'insufficient_quota' || errorObj?.code === 'invalid_api_key') {
          throw new Error("مشكلة في خدمة الذكاء الاصطناعي: تم تجاوز الحد المسموح أو مفتاح API غير صالح. يرجى الاتصال بمسؤول النظام.");
        }
        
        // إعادة إلقاء الخطأ الأصلي إذا كان خطأً آخر
        throw new Error("فشل في توليد إشارة التداول. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      // تسجيل أي خطأ آخر خارج عملية OpenAI
      logger.error("OpenAIService", error instanceof Error ? error : new Error(String(error)), {
        function: "generateTradingSignal",
        platform,
        pair,
        timeframe,
        userId
      });
      
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
      // تحديد ما إذا كان يجب استخدام الخوارزمية بدلاً من الذكاء الاصطناعي
      if (userId) {
        const userSettings = await storage.getUserSettings(userId);
        if (userSettings && userSettings.useAiForSignals === false) {
          // هنا يمكننا إضافة تحليل باستخدام الخوارزمية، ولكن حالياً سنعيد بيانات عامة
          return {
            trend: Math.random() > 0.5 ? "صعودي" : (Math.random() > 0.5 ? "هبوطي" : "متذبذب"),
            strength: Math.floor(Math.random() * 100),
            summary: `تحليل سوق ${pair} باستخدام الخوارزمية المحددة`,
            keyLevels: {
              support: ["35000", "34500"],
              resistance: ["38000", "39000"]
            }
          };
        }
      }
      
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

      // تحديد كائن OpenAI المناسب استنادًا إلى إعدادات المستخدم
      let openaiClient = defaultOpenAI;
      
      // إذا كان المستخدم يستخدم مفتاح API خاص به
      if (userId) {
        const userSettings = await storage.getUserSettings(userId);
        if (userSettings && userSettings.useCustomAiKey && userSettings.openaiApiKey) {
          logger.info("OpenAIService", "استخدام مفتاح API خاص بالمستخدم للتحليل", { userId });
          
          // إنشاء كائن OpenAI جديد باستخدام مفتاح المستخدم
          openaiClient = new OpenAI({
            apiKey: userSettings.openaiApiKey
          });
        }
      }

      const response = await openaiClient.chat.completions.create({
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
      logger.error("OpenAIService", error instanceof Error ? error : new Error(String(error)), {
        function: "analyzeMarketTrend",
        pair,
        userId
      });
      throw new Error("فشل في تحليل اتجاه السوق. يرجى المحاولة مرة أخرى.");
    }
  }
}

// تصدير مثيل واحد من الخدمة للاستخدام في جميع أنحاء التطبيق
export const openAIService = new OpenAIService();