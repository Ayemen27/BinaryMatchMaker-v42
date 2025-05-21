import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, Check, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const TelegramPaymentGuidePage = () => {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // استخراج معلومات الدفع من عنوان URL
  const searchParams = new URLSearchParams(window.location.search);
  const planType = searchParams.get('plan') || 'weekly';
  const starsAmount = searchParams.get('stars') || '750';
  const botCommand = `/pay ${planType} ${starsAmount}`;
  
  // خيارات متعددة للتواصل مع البوت
  const botUsername = 'Payment_gateway_Binar_bot';
  const telegramBotUrl = `https://t.me/${botUsername}`;
  
  // تعديل اسم البوت - استخدام البوت الرسمي للمنصة
  const alternativeBotUsername = 'Payment_gateway_Binar_bot';
  const alternativeTelegramBotUrl = `https://t.me/${alternativeBotUsername}`;
  
  // نسخ الأمر إلى الحافظة
  const copyCommand = () => {
    navigator.clipboard.writeText(botCommand)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        toast({
          title: 'تم نسخ الأمر',
          description: 'يمكنك الآن لصق الأمر في محادثة البوت',
          duration: 3000,
        });
      })
      .catch(err => {
        console.error('فشل في نسخ الأمر:', err);
        toast({
          title: 'فشل النسخ',
          description: 'حاول نسخ الأمر يدوياً',
          variant: 'destructive',
          duration: 3000,
        });
      });
  };
  
  // الانتقال إلى بوت تلجرام
  const goToTelegram = () => {
    window.open(telegramBotUrl, '_blank');
  };
  
  // العودة إلى صفحة الاشتراكات
  const goBack = () => {
    setLocation('/subscriptions');
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={goBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        العودة إلى الاشتراكات
      </Button>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">الدفع بنجوم تلجرام</h1>
        <p className="text-muted-foreground">اتبع الخطوات التالية لإكمال عملية الدفع بنجوم تلجرام</p>
      </div>
      
      <Card className="p-6 mb-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">تفاصيل الدفع</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">الخطة</p>
                <p className="font-medium">{planType === 'weekly' ? 'أسبوعية' : planType === 'monthly' ? 'شهرية' : 'سنوية'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد النجوم</p>
                <p className="font-medium">{starsAmount} نجمة</p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">كيفية إكمال الدفع</h2>
            <ol className="list-decimal space-y-4 pr-5">
              <li className="py-1">افتح بوت تلجرام بالضغط على زر "فتح بوت تلجرام" أدناه</li>
              <li className="py-1">انسخ أمر الدفع أدناه وأرسله إلى البوت</li>
              <li className="py-1">اتبع تعليمات البوت لإكمال عملية الدفع</li>
              <li className="py-1">بعد الانتهاء، عد إلى الموقع للتحقق من حالة اشتراكك</li>
            </ol>
          </div>
          
          <div className="border border-border rounded-md p-4">
            <h3 className="text-lg font-medium mb-2">أمر الدفع</h3>
            <div className="flex items-center justify-between bg-muted p-3 rounded-md">
              <code className="font-mono text-sm">{botCommand}</code>
              <Button 
                size="sm"
                variant="ghost"
                onClick={copyCommand}
                aria-label="نسخ الأمر"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={goToTelegram} className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          فتح بوت تلجرام
        </Button>
        <Button variant="outline" onClick={goBack}>
          العودة إلى الاشتراكات
        </Button>
      </div>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>ملاحظة: يجب أن تكون مسجلاً في تلجرام لإكمال عملية الدفع بالنجوم.</p>
      </div>
    </div>
  );
};

export default TelegramPaymentGuidePage;