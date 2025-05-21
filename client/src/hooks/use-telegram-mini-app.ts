import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

// واجهة لمعلومات مستخدم تلجرام
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

// واجهة لبيانات الدفع المرسلة من التطبيق المصغر
interface MiniAppPaymentData {
  action: string;
  paymentId: string;
  planId: string;
  planType: string;
  starsAmount: number;
  timestamp: number;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * خطاف React للتعامل مع التطبيق المصغر لتلجرام
 * يوفر وظائف متعددة لتسهيل التكامل مع التطبيق المصغر
 */
export function useTelegramMiniApp() {
  const [telegramWebApp, setTelegramWebApp] = useState<any>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // تهيئة واجهة برمجة تطبيقات تلجرام
  useEffect(() => {
    const initTelegramWebApp = () => {
      const tgWebApp = (window as any).Telegram?.WebApp;
      
      if (tgWebApp) {
        console.log('تم اكتشاف Telegram WebApp SDK');
        setTelegramWebApp(tgWebApp);
        setIsInTelegram(true);
        
        // إخبار تطبيق تلجرام أن التطبيق جاهز
        tgWebApp.ready();
        setIsReady(true);
        
        // التحقق من وضع السمة (داكن أو فاتح)
        setIsDarkMode(tgWebApp.colorScheme === 'dark');
        
        // استخراج معلومات المستخدم
        if (tgWebApp.initDataUnsafe?.user) {
          setTelegramUser(tgWebApp.initDataUnsafe.user);
          console.log('تم استخراج معلومات المستخدم:', tgWebApp.initDataUnsafe.user);
        } else {
          console.warn('لم يتم العثور على معلومات المستخدم في WebApp');
        }
        
        // تعيين معالج البيانات المرسلة
        tgWebApp.onEvent('mainButtonClicked', () => {
          console.log('تم النقر على الزر الرئيسي');
        });
      } else {
        console.warn('Telegram WebApp SDK غير متاح');
        setIsInTelegram(false);
        setIsReady(true); // نعتبر التطبيق جاهز حتى خارج تلجرام للاختبار
      }
    };

    // تأخير التهيئة قليلاً للتأكد من تحميل SDK
    const timeoutId = setTimeout(initTelegramWebApp, 500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  /**
   * معالجة بيانات الدفع المستلمة من التطبيق المصغر
   */
  const handlePaymentData = async (data: MiniAppPaymentData): Promise<boolean> => {
    try {
      console.log('معالجة بيانات الدفع من التطبيق المصغر:', data);
      
      // إرسال بيانات الدفع إلى الخادم
      const response = await fetch('/api/telegram-mini-app/process-mini-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: data.action,
          paymentId: data.paymentId,
          planType: data.planType,
          starsAmount: data.starsAmount,
          timestamp: data.timestamp,
          telegramUserId: data.userId?.toString() || '',
          telegramUsername: data.username || '',
          telegramFirstName: data.firstName || '',
          telegramLastName: data.lastName || ''
        })
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        console.log('تم معالجة بيانات الدفع بنجاح:', responseData);
        return true;
      } else {
        console.error('فشل في معالجة بيانات الدفع:', responseData);
        return false;
      }
    } catch (error) {
      console.error('خطأ في معالجة بيانات الدفع:', error);
      return false;
    }
  };

  /**
   * فتح بوت الدفع عبر تلجرام
   */
  const openPaymentBot = (params: { planType: string; starsAmount: number; userId?: number | string }): boolean => {
    try {
      if (!telegramWebApp) {
        console.warn('Telegram WebApp SDK غير متاح');
        return false;
      }
      
      const botUsername = 'Payment_gateway_Binar_bot';
      let userParams = '';
      
      if (params.userId) {
        userParams = `_${params.userId}`;
      } else if (telegramUser?.id) {
        userParams = `_${telegramUser.id}`;
      }
      
      // إنشاء رابط بوت الدفع
      const startParam = `pay_${params.planType}_${params.starsAmount}${userParams}`;
      const botUrl = `https://t.me/${botUsername}?start=${startParam}`;
      
      console.log('فتح رابط بوت الدفع:', botUrl);
      
      // استخدام المنصة لفتح البوت
      telegramWebApp.openTelegramLink(botUrl);
      return true;
    } catch (error) {
      console.error('خطأ في فتح بوت الدفع:', error);
      return false;
    }
  };

  /**
   * إظهار الزر الرئيسي في واجهة تلجرام
   */
  const showMainButton = (text: string, color?: string, textColor?: string): void => {
    if (!telegramWebApp?.MainButton) {
      console.warn('زر تلجرام الرئيسي غير متاح');
      return;
    }
    
    telegramWebApp.MainButton.setParams({
      text,
      color: color || telegramWebApp.themeParams.button_color || '#50a8eb',
      text_color: textColor || telegramWebApp.themeParams.button_text_color || '#ffffff',
      is_visible: true
    });
  };

  /**
   * إخفاء الزر الرئيسي في واجهة تلجرام
   */
  const hideMainButton = (): void => {
    if (!telegramWebApp?.MainButton) {
      return;
    }
    
    telegramWebApp.MainButton.hide();
  };

  /**
   * تعيين معالج للزر الرئيسي
   */
  const setMainButtonHandler = (handler: () => void): void => {
    if (!telegramWebApp?.MainButton) {
      console.warn('زر تلجرام الرئيسي غير متاح');
      return;
    }
    
    telegramWebApp.MainButton.onClick(handler);
  };

  /**
   * إغلاق التطبيق المصغر
   */
  const closeApp = (): void => {
    if (!telegramWebApp) {
      window.close();
      return;
    }
    
    telegramWebApp.close();
  };

  /**
   * إظهار تنبيه للمستخدم
   */
  const showAlert = (message: string): void => {
    if (!telegramWebApp) {
      alert(message);
      return;
    }
    
    telegramWebApp.showAlert(message);
  };

  return {
    telegramWebApp,
    telegramUser,
    isReady,
    isInTelegram,
    isDarkMode,
    handlePaymentData,
    openPaymentBot,
    showMainButton,
    hideMainButton,
    setMainButtonHandler,
    closeApp,
    showAlert
  };
}