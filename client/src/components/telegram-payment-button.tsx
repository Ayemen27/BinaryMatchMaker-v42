import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTelegramMiniApp } from '@/hooks/use-telegram-mini-app';

interface TelegramPaymentButtonProps {
  planType: string;
  starsAmount: number;
  userId?: number | string;
  buttonText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

/**
 * زر دفع نجوم تلجرام
 * يستخدم لفتح بوت تلجرام مباشرة مع معلمات الدفع
 */
export function TelegramPaymentButton({
  planType,
  starsAmount,
  userId,
  buttonText,
  variant = 'default',
  className = ''
}: TelegramPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { openPaymentBot } = useTelegramMiniApp();
  
  const displayName = {
    weekly: 'أسبوعي',
    monthly: 'شهري',
    annual: 'سنوي',
    premium: 'مميز'
  }[planType];
  
  // التعامل مع النقر على زر الدفع
  const handlePayment = () => {
    setIsProcessing(true);
    
    try {
      // محاولة فتح بوت تلجرام مباشرة
      const success = openPaymentBot({
        planType,
        starsAmount,
        userId
      });
      
      if (!success) {
        // إذا فشل فتح البوت، نفتح رابط البوت في نافذة جديدة
        const botUsername = 'Payment_gateway_Binar_bot';
        let userParam = '';
        
        if (userId) {
          userParam = `_${userId}`;
        }
        
        const startParam = `pay_${planType}_${starsAmount}${userParam}`;
        const botUrl = `https://t.me/${botUsername}?start=${startParam}`;
        
        window.open(botUrl, '_blank');
      }
    } catch (error) {
      console.error('خطأ في فتح بوت الدفع:', error);
      
      // احتياطيًا، نوجه المستخدم إلى صفحة دليل الدفع بالتلجرام
      window.location.href = `/telegram-payment-guide?plan=${planType}&amount=${starsAmount}`;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isProcessing}
      variant={variant}
      className={`flex items-center gap-2 ${className}`}
    >
      {isProcessing ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          جاري التحضير...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          {buttonText || `دفع ${starsAmount} نجمة (${displayName})`}
        </>
      )}
    </Button>
  );
}