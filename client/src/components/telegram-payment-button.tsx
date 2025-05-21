import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface TelegramPaymentButtonProps {
  planId: string;
  botVersion: string;
  price: number;
  onPaymentInitiated?: () => void;
}

/**
 * زر الدفع المخصص لتطبيق تلجرام المصغر
 * يقوم بإرسال المعلومات مباشرة إلى بوت التلجرام عند النقر
 */
export function TelegramPaymentButton({
  planId,
  botVersion,
  price,
  onPaymentInitiated
}: TelegramPaymentButtonProps) {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [tg, setTg] = useState<any>(null);

  // التحقق من وجود التطبيق في بيئة تلجرام
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      setIsInTelegram(true);
      setTg(window.Telegram.WebApp);

      // تهيئة واجهة التطبيق
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // معالج الدفع
  const handlePayment = () => {
    if (isInTelegram && tg) {
      // إنشاء معرف فريد للدفع
      const paymentId = `${planId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // بيانات الدفع
      const paymentData = {
        action: 'process_stars_payment',
        planId,
        botVersion,
        price,
        paymentId,
        timestamp: Date.now()
      };

      // إرسال البيانات إلى بوت تلجرام
      tg.sendData(JSON.stringify(paymentData));
      
      // إظهار زر الدفع الرئيسي إذا كان التطبيق في بيئة تلجرام
      // تلجرام يتولى عملية الدفع من هنا
      
      if (onPaymentInitiated) {
        onPaymentInitiated();
      }
    } else {
      // في بيئة المتصفح العادي، نعرض رسالة تنبيه
      alert("يرجى فتح التطبيق من داخل تلجرام للدفع بالنجوم");
    }
  };

  return (
    <div className="telegram-payment-wrapper" dir="rtl">
      {isInTelegram ? (
        <Button 
          onClick={handlePayment}
          className="w-full bg-gradient-to-r from-[#1E88E5] to-[#1565C0] hover:from-[#1976D2] hover:to-[#0D47A1]"
        >
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 240 240" fill="none">
              <path d="M120 240C186.274 240 240 186.274 240 120C240 53.7258 186.274 0 120 0C53.7258 0 0 53.7258 0 120C0 186.274 53.7258 240 120 240Z" fill="white"/>
              <path d="M98.5 174C95.4 174 96.1 172.7 95 169.7L84 132.7L173 80" fill="#C6DBFA"/>
              <path d="M98.5 174C102.5 174 104.2 172.3 106.5 170L120 157L100.5 145.5" fill="#A1C1EA"/>
              <path d="M100.5 145.5L149 181.5C156.4 185.6 161.7 183.5 163.5 174.8L184.1 82.2C187 71.6 180.2 66.7 173.2 69.8L53.9 113.8C43.6 118 43.7 123.8 52 126.4L83.8 136.2L156.5 93.4C160.8 90.8 164.7 92.2 161.5 95.1" fill="white"/>
            </svg>
            دفع {price} نجمة
          </span>
        </Button>
      ) : (
        <div className="telegram-payment-simulation">
          <Button 
            onClick={handlePayment}
            className="w-full bg-gray-400"
          >
            يجب فتح التطبيق من تلجرام
          </Button>
          <p className="text-xs mt-2 text-gray-500">
            للدفع بنجوم تلجرام، يرجى فتح التطبيق من داخل تطبيق تلجرام.
          </p>
        </div>
      )}
    </div>
  );
}

// إضافة الأنواع لواجهة تلجرام
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        sendData: (data: string) => void;
        MainButton: {
          text: string;
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          setParams: (params: any) => void;
        };
      };
    };
  }
}