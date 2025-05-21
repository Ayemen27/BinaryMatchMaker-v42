import { useEffect, useState } from 'react';

// نوع البيانات الذي يمثل بيانات طلب الدفع
export interface PaymentRequestData {
  planType: string;
  starsAmount: number;
  userId?: number | string;
  botUsername?: string;
}

// نوع البيانات الذي يمثل بيانات الاستجابة من تلجرام
export interface TelegramMiniAppData {
  initData?: string;
  initDataUnsafe?: any;
  version?: string;
  platform?: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string>;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  isClosingConfirmationEnabled?: boolean;
}

/**
 * Hook يوفر واجهة للتعامل مع تطبيق تلجرام المصغر
 * يتضمن وظائف للتعامل مع واجهة برمجة التطبيقات الخاصة بـ Telegram Mini App
 */
export function useTelegramMiniApp() {
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState<boolean>(false);
  const [telegramData, setTelegramData] = useState<TelegramMiniAppData>({});
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // التحقق من وجود كائن Telegram WebApp عند تحميل الهوك
  useEffect(() => {
    // التحقق إذا كان التطبيق يعمل داخل تطبيق تلجرام المصغر
    const telegram = (window as any).Telegram?.WebApp;
    
    if (telegram) {
      setIsTelegramMiniApp(true);
      
      // تخزين البيانات المتاحة من تلجرام
      setTelegramData({
        initData: telegram.initData,
        initDataUnsafe: telegram.initDataUnsafe,
        version: telegram.version,
        platform: telegram.platform,
        colorScheme: telegram.colorScheme,
        themeParams: telegram.themeParams,
        isExpanded: telegram.isExpanded,
        viewportHeight: telegram.viewportHeight,
        viewportStableHeight: telegram.viewportStableHeight,
        isClosingConfirmationEnabled: telegram.isClosingConfirmationEnabled
      });
      
      // إعلام تلجرام أن التطبيق جاهز
      telegram.ready();
      telegram.expand();
      
      setIsInitialized(true);
      
      // الاستماع لتغييرات السمة
      telegram.onEvent('themeChanged', () => {
        setTelegramData(prev => ({
          ...prev,
          colorScheme: telegram.colorScheme,
          themeParams: telegram.themeParams
        }));
      });
      
      // الاستماع لتغييرات الارتفاع
      telegram.onEvent('viewportChanged', () => {
        setTelegramData(prev => ({
          ...prev,
          viewportHeight: telegram.viewportHeight,
          viewportStableHeight: telegram.viewportStableHeight,
          isExpanded: telegram.isExpanded
        }));
      });
    } else {
      setIsTelegramMiniApp(false);
      setIsInitialized(true);
    }
    
    // تنظيف المستمعين عند إزالة المكون
    return () => {
      if (telegram) {
        telegram.offEvent('themeChanged');
        telegram.offEvent('viewportChanged');
      }
    }
  }, []);

  /**
   * فتح بوت تلجرام مع معلمات الدفع
   * يعمل داخل التطبيق المصغر وخارجه
   */
  const openPaymentBot = (data: PaymentRequestData): boolean => {
    try {
      const { planType, starsAmount, userId, botUsername = 'Payment_gateway_Binar_bot' } = data;
      
      // بناء أمر البدء مع معلمات الدفع
      let startParam = `pay_${planType}_${starsAmount}`;
      if (userId) {
        startParam += `_${userId}`;
      }
      
      // محاولة استخدام واجهة برمجة تطبيقات تلجرام المصغر إذا كانت متاحة
      const telegram = (window as any).Telegram?.WebApp;
      
      if (telegram && telegram.openTelegramLink) {
        // استخدام واجهة برمجة التطبيقات المصغر لفتح الرابط
        const botUrl = `https://t.me/${botUsername}?start=${startParam}`;
        telegram.openTelegramLink(botUrl);
        return true;
      } else {
        // إنشاء رابط بديل يفتح في نافذة جديدة
        const botUrl = `https://t.me/${botUsername}?start=${startParam}`;
        window.open(botUrl, '_blank');
        return false;
      }
    } catch (error) {
      console.error('فشل في فتح بوت الدفع:', error);
      return false;
    }
  };
  
  /**
   * التحقق من دفعة نجوم تلجرام
   * يرسل طلبًا للتحقق من حالة دفعة معينة
   */
  const verifyStarsPayment = async (paymentId: string, userId?: string | number): Promise<any> => {
    try {
      // إنشاء البيانات اللازمة للتحقق
      const verificationData = {
        paymentId,
        userId: userId || 'guest',
        telegramInitData: isTelegramMiniApp ? telegramData.initData : undefined
      };
      
      // إرسال طلب للتحقق من الدفع
      const response = await fetch('/api/telegram-payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verificationData)
      });
      
      if (!response.ok) {
        throw new Error(`Error verifying payment: ${response.status}`);
      }
      
      // إرجاع نتيجة التحقق
      return await response.json();
    } catch (error) {
      console.error('فشل في التحقق من الدفع:', error);
      throw error;
    }
  };
  
  /**
   * إرسال بيانات المستخدم إلى الخادم بعد عملية الدفع
   */
  const sendPaymentResult = async (data: any): Promise<any> => {
    try {
      // إرسال بيانات الدفع إلى الخادم
      const response = await fetch('/api/telegram-mini-app/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          telegramInitData: isTelegramMiniApp ? telegramData.initData : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error sending payment result: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('فشل في إرسال نتيجة الدفع:', error);
      throw error;
    }
  };
  
  /**
   * تهيئة إعدادات السمة من بيانات تلجرام
   */
  const initializeThemeFromTelegram = () => {
    if (!isTelegramMiniApp) return;
    
    const telegram = (window as any).Telegram?.WebApp;
    if (!telegram) return;
    
    // تعيين السمة استنادًا إلى سمة تلجرام
    if (telegram.colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // تطبيق متغيرات CSS بناءً على سمة تلجرام
    if (telegram.themeParams) {
      const root = document.documentElement;
      
      // لون النص
      if (telegram.themeParams.text_color) {
        root.style.setProperty('--tg-text-color', telegram.themeParams.text_color);
      }
      
      // لون الخلفية
      if (telegram.themeParams.bg_color) {
        root.style.setProperty('--tg-bg-color', telegram.themeParams.bg_color);
      }
      
      // لون الزر
      if (telegram.themeParams.button_color) {
        root.style.setProperty('--tg-button-color', telegram.themeParams.button_color);
      }
      
      // لون نص الزر
      if (telegram.themeParams.button_text_color) {
        root.style.setProperty('--tg-button-text-color', telegram.themeParams.button_text_color);
      }
    }
  };
  
  // توفير واجهة التطبيق المصغر للمكونات
  return {
    isTelegramMiniApp,
    telegramData,
    isInitialized,
    openPaymentBot,
    verifyStarsPayment,
    sendPaymentResult,
    initializeThemeFromTelegram
  };
}