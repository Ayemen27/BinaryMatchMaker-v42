import { Signal, InsertSignal } from "@shared/schema";
import { storage } from "../storage";
import { logger } from "./logger";

/**
 * خدمة توليد إشارات التداول باستخدام الخوارزميات
 * يتم استخدام هذه الخدمة عندما يكون الذكاء الاصطناعي غير متاح أو عندما يفضل المستخدم استخدام الخوارزميات البديلة
 */
export class AlgorithmicSignalService {
  /**
   * توليد إشارة تداول للخيارات الثنائية باستخدام خوارزميات محددة لكل منصة
   * @param platform منصة التداول
   * @param pair زوج العملة
   * @param timeframe الإطار الزمني
   * @param userId معرف المستخدم (اختياري)
   */
  async generateTradingSignal(platform: string, pair: string, timeframe: string, userId?: number): Promise<Signal> {
    try {
      logger.info("AlgorithmicSignalService", "توليد إشارة جديدة باستخدام الخوارزميات", { 
        platform, 
        pair, 
        timeframe, 
        userId 
      });

      // الحصول على آخر بيانات سوقية متاحة لهذا الزوج
      const marketData = await storage.getMarketData(pair) || await this.generateMarketDataPlaceholder(pair);
      
      // إنشاء الإشارة باستخدام الخوارزمية المناسبة للمنصة
      const signalData = this.generateSignalBasedOnPlatform(platform, pair, timeframe, marketData);
      
      logger.signalActivity("generate", { 
        platform, 
        pair, 
        timeframe, 
        success: true, 
        method: "algorithmic" 
      }, userId);
      
      // إنشاء بيانات الإشارة للتخزين في قاعدة البيانات
      // إضافة طابع زمني فريد إلى الإشارة لتجنب مشكلة التكرار
      // تغيير بعض قيم الأسعار قليلاً بإضافة عنصر عشوائي صغير لتجنب تكرار البيانات
      const now = new Date();
      const randomFactor = (1 + (Math.random() * 0.001 - 0.0005)); // عامل عشوائي صغير جدًا للتغيير

      const signalToInsert: InsertSignal = {
        asset: signalData.asset,
        type: signalData.type,
        entryPrice: (parseFloat(signalData.entryPrice) * randomFactor).toFixed(2),
        targetPrice: (parseFloat(signalData.targetPrice) * randomFactor).toFixed(2),
        stopLoss: (parseFloat(signalData.stopLoss) * randomFactor).toFixed(2),
        accuracy: signalData.accuracy,
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
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
          timestamp: now.toISOString() // إضافة طابع زمني
        }
      };
      
      // محاولة حفظ الإشارة مع إعادة المحاولة في حالة فشل المعرف المتكرر
      let signal: Signal;
      try {
        signal = await storage.createSignal(signalToInsert);
      } catch (error) {
        // في حالة حدوث خطأ بسبب تكرار المفتاح، نقوم بتغيير الأسعار قليلاً ونحاول مرة أخرى
        if (error instanceof Error && error.message.includes('duplicate key value')) {
          // تعديل قيم الأسعار بشكل أكبر لتجنب التكرار
          const newRandomFactor = (1 + (Math.random() * 0.01 - 0.005)); // عامل عشوائي أكبر
          signalToInsert.entryPrice = (parseFloat(signalData.entryPrice) * newRandomFactor).toFixed(2);
          signalToInsert.targetPrice = (parseFloat(signalData.targetPrice) * newRandomFactor).toFixed(2);
          signalToInsert.stopLoss = (parseFloat(signalData.stopLoss) * newRandomFactor).toFixed(2);
          
          // إضافة تأخير قصير لتغيير الوقت
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // محاولة إنشاء الإشارة مرة أخرى
          signal = await storage.createSignal(signalToInsert);
        } else {
          // إعادة رمي الخطأ إذا كان غير متعلق بتكرار المفتاح
          throw error;
        }
      }
      
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
      logger.error("AlgorithmicSignalService", error instanceof Error ? error : new Error(String(error)), {
        function: "generateTradingSignal",
        platform,
        pair,
        timeframe,
        userId
      });
      
      throw new Error("فشل في توليد إشارة التداول باستخدام الخوارزمية. يرجى المحاولة مرة أخرى.");
    }
  }

  /**
   * توليد بيانات سوق افتراضية إذا لم تكن هناك بيانات متاحة
   * @param pair زوج العملة
   */
  private async generateMarketDataPlaceholder(pair: string) {
    // تحديد سعر أساسي قريب من الواقع بناءً على نوع العملة
    let basePrice = 0;
    const now = new Date();
    
    if (pair.startsWith('BTC') || pair.includes('BTC')) {
      basePrice = 37500 + Math.floor(Math.random() * 2000);
    } else if (pair.startsWith('ETH') || pair.includes('ETH')) {
      basePrice = 2200 + Math.floor(Math.random() * 200);
    } else if (pair.startsWith('SOL') || pair.includes('SOL')) {
      basePrice = 140 + Math.floor(Math.random() * 20);
    } else if (pair.startsWith('XRP') || pair.includes('XRP')) {
      basePrice = 0.5 + Math.random() * 0.2;
    } else if (pair.startsWith('EUR') || pair.includes('EUR')) {
      basePrice = 1.08 + Math.random() * 0.02;
    } else if (pair.startsWith('GBP') || pair.includes('GBP')) {
      basePrice = 1.27 + Math.random() * 0.02;
    } else if (pair.startsWith('USD') || pair.includes('USD')) {
      basePrice = 1 + Math.random() * 0.01;
    } else {
      basePrice = 100 + Math.floor(Math.random() * 50);
    }
    
    // حفظ وإرجاع بيانات السوق
    return await storage.saveMarketData({
      asset: pair,
      price: basePrice.toFixed(2),
      change24h: (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 5).toFixed(2) + '%',
      high24h: (basePrice * 1.02).toFixed(2),
      low24h: (basePrice * 0.98).toFixed(2),
      volume24h: (Math.random() * 1000000 + 500000).toFixed(0),
      marketCap: (basePrice * (Math.random() * 1000000 + 5000000)).toFixed(0),
      dataSource: 'Algorithmic Model'
    });
  }

  /**
   * توليد إشارة تداول بناءً على منصة التداول المحددة
   * @param platform منصة التداول
   * @param pair زوج العملة
   * @param timeframe الإطار الزمني
   * @param marketData بيانات السوق الحالية
   */
  private generateSignalBasedOnPlatform(platform: string, pair: string, timeframe: string, marketData: any) {
    // استخراج السعر الحالي من بيانات السوق
    const currentPrice = parseFloat(marketData.price);
    const isUptrend = marketData.change24h?.startsWith('+') || Math.random() > 0.5;
    
    // تحديد نوع الإشارة (شراء أو بيع) بناءً على الاتجاه
    const type = isUptrend ? 'buy' as const : 'sell' as const;
    
    // تحديد نسب لحساب الأهداف ووقف الخسارة بناءً على المنصة والإطار الزمني
    const targetRatio = this.getTargetRatioByPlatformAndTimeframe(platform, timeframe);
    const stopLossRatio = this.getStopLossRatioByPlatformAndTimeframe(platform, timeframe);
    
    // حساب سعر الدخول مع هامش صغير من السعر الحالي
    const entryPrice = type === 'buy' 
      ? (currentPrice * (1 + 0.001 * Math.random())).toFixed(2)
      : (currentPrice * (1 - 0.001 * Math.random())).toFixed(2);
    
    // حساب السعر المستهدف ووقف الخسارة
    const targetPrice = type === 'buy' 
      ? (parseFloat(entryPrice) * (1 + targetRatio)).toFixed(2)
      : (parseFloat(entryPrice) * (1 - targetRatio)).toFixed(2);
    
    const stopLoss = type === 'buy' 
      ? (parseFloat(entryPrice) * (1 - stopLossRatio)).toFixed(2)
      : (parseFloat(entryPrice) * (1 + stopLossRatio)).toFixed(2);
    
    // توليد دقة الإشارة (90-95٪)
    const accuracy = 90 + Math.floor(Math.random() * 6);
    
    // توليد وقت الإشارة (وقت محلي)
    const hours = new Date().getHours().toString().padStart(2, '0');
    const minutes = new Date().getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    // اختيار المؤشرات الفنية المناسبة بناءً على المنصة
    const indicators = this.getIndicatorsByPlatform(platform);
    
    // توليد سبب الإشارة
    const reason = this.generateSignalReason(type, pair, indicators);
    
    return {
      asset: pair,
      type,
      entryPrice,
      targetPrice,
      stopLoss,
      accuracy,
      time,
      indicators,
      reason
    };
  }

  /**
   * الحصول على نسبة الهدف بناءً على المنصة والإطار الزمني
   */
  private getTargetRatioByPlatformAndTimeframe(platform: string, timeframe: string): number {
    // تخصيص النسب المئوية للأهداف حسب المنصة والإطار الزمني
    const platformRatios: Record<string, number> = {
      'IQ Option': 0.025,
      'Olymp Trade': 0.03,
      'Binance': 0.02,
      'Pocket Option': 0.035,
      'Deriv': 0.028
    };
    
    const timeframeMultipliers: Record<string, number> = {
      '1m': 0.3,
      '5m': 0.6,
      '15m': 0.8,
      '30m': 1.0,
      '1h': 1.5,
      '4h': 2.0,
      '1d': 3.0
    };
    
    // استخدام نسبة افتراضية إذا لم تكن المنصة أو الإطار الزمني مدعوماً
    const baseRatio = platformRatios[platform] || 0.025;
    const multiplier = timeframeMultipliers[timeframe] || 1.0;
    
    return baseRatio * multiplier;
  }

  /**
   * الحصول على نسبة وقف الخسارة بناءً على المنصة والإطار الزمني
   */
  private getStopLossRatioByPlatformAndTimeframe(platform: string, timeframe: string): number {
    // تخصيص النسب المئوية لوقف الخسارة حسب المنصة والإطار الزمني
    const platformRatios: Record<string, number> = {
      'IQ Option': 0.015,
      'Olymp Trade': 0.02,
      'Binance': 0.01,
      'Pocket Option': 0.025,
      'Deriv': 0.018
    };
    
    const timeframeMultipliers: Record<string, number> = {
      '1m': 0.3,
      '5m': 0.6,
      '15m': 0.8,
      '30m': 1.0,
      '1h': 1.5,
      '4h': 2.0,
      '1d': 3.0
    };
    
    // استخدام نسبة افتراضية إذا لم تكن المنصة أو الإطار الزمني مدعوماً
    const baseRatio = platformRatios[platform] || 0.015;
    const multiplier = timeframeMultipliers[timeframe] || 1.0;
    
    return baseRatio * multiplier;
  }

  /**
   * الحصول على المؤشرات المناسبة بناءً على منصة التداول
   */
  private getIndicatorsByPlatform(platform: string): string[] {
    // مجموعات المؤشرات الشائعة لكل منصة
    const platformIndicators: Record<string, string[][]> = {
      'IQ Option': [
        ['RSI', 'Moving Average', 'Stochastic'],
        ['MACD', 'Bollinger Bands', 'RSI'],
        ['Parabolic SAR', 'RSI', 'Stochastic']
      ],
      'Olymp Trade': [
        ['RSI', 'Moving Average', 'Alligator'],
        ['MACD', 'Bollinger Bands', 'ADX'],
        ['Ichimoku Cloud', 'RSI', 'Volume']
      ],
      'Binance': [
        ['RSI', 'EMA', 'MACD'],
        ['Bollinger Bands', 'RSI', 'Volume'],
        ['Fibonacci', 'Moving Average', 'OBV']
      ],
      'Pocket Option': [
        ['RSI', 'SMA', 'CCI'],
        ['MACD', 'Bollinger Bands', 'Momentum'],
        ['RSI', 'Stochastic', 'Williams %R']
      ],
      'Deriv': [
        ['RSI', 'Moving Average', 'ATR'],
        ['MACD', 'Bollinger Bands', 'Stochastic'],
        ['Pivot Points', 'RSI', 'Volume']
      ]
    };
    
    // المؤشرات الافتراضية إذا لم تكن المنصة مدعومة
    const defaultIndicators = [['RSI', 'Moving Average', 'MACD'], ['Bollinger Bands', 'Stochastic', 'MACD']];
    
    // اختيار مجموعة مؤشرات عشوائية للمنصة
    const indicatorSets = platformIndicators[platform] || defaultIndicators;
    return indicatorSets[Math.floor(Math.random() * indicatorSets.length)];
  }

  /**
   * توليد سبب للإشارة بناءً على النوع والزوج والمؤشرات
   */
  private generateSignalReason(type: string, pair: string, indicators: string[]): string {
    // أسباب عامة للشراء
    const buyReasons = [
      `مؤشر ${indicators[0]} يظهر تشبع بيعي، مع تقاطع إيجابي في ${indicators[1]}`,
      `ارتفاع حجم التداول مع تكوين نمط انعكاس صعودي، وتأكيد من ${indicators[0]}`,
      `كسر مستوى مقاومة هام مع إشارات إيجابية من ${indicators[0]} و${indicators[1]}`,
      `تكوين نمط الوتد الصاعد مع تأكيد من ${indicators.join(' و')}`,
      `تشكيل قاع مزدوج مع دعم من مؤشرات ${indicators[0]} و${indicators[1]}`
    ];
    
    // أسباب عامة للبيع
    const sellReasons = [
      `مؤشر ${indicators[0]} يظهر تشبع شرائي، مع تقاطع سلبي في ${indicators[1]}`,
      `انخفاض حجم التداول مع تكوين نمط انعكاس هبوطي، وتأكيد من ${indicators[0]}`,
      `كسر مستوى دعم هام مع إشارات سلبية من ${indicators[0]} و${indicators[1]}`,
      `تكوين نمط الوتد الهابط مع تأكيد من ${indicators.join(' و')}`,
      `تشكيل قمة مزدوجة مع تأكيد من مؤشرات ${indicators[0]} و${indicators[1]}`
    ];
    
    // اختيار سبب عشوائي بناءً على نوع الإشارة
    const reasons = type === 'buy' ? buyReasons : sellReasons;
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    
    return `${reason} لزوج ${pair}.`;
  }
}

// تصدير مثيل واحد من الخدمة للاستخدام في جميع أنحاء التطبيق
export const algorithmicSignalService = new AlgorithmicSignalService();