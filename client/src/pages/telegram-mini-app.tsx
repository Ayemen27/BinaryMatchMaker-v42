import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';

// تعريف أنواع البيانات لـ Telegram WebApp
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        onEvent: (eventType: string, eventHandler: any) => void;
        offEvent: (eventType: string, eventHandler: any) => void;
        sendData: (data: string) => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          isVisible: boolean;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        initData: string;
        initDataUnsafe: any;
        colorScheme: 'light' | 'dark';
        close: () => void;
      };
    };
  }
}

// أسعار الخطط بعملة النجوم
const PLAN_PRICES = {
  weekly_plan: 750,
  monthly_plan: 2300,
  annual_plan: 10000,
  premium_plan: 18500
};

// معلومات الخطط
const PLAN_INFO = {
  weekly_plan: {
    name: 'الخطة الأسبوعية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة أسبوع',
    features: ['10 إشارات يوميًا', 'تحليل سوق الفوركس', 'دعم الخيارات الثنائية']
  },
  monthly_plan: {
    name: 'الخطة الشهرية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة شهر',
    features: ['25 إشارة يوميًا', 'تحليل سوق الفوركس والعملات الرقمية', 'دعم الخيارات الثنائية', 'تنبيهات فورية']
  },
  annual_plan: {
    name: 'الخطة السنوية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة سنة',
    features: ['50 إشارة يوميًا', 'تحليل جميع الأسواق', 'دعم الخيارات الثنائية والعقود', 'تنبيهات فورية', 'دعم فني على مدار الساعة']
  },
  premium_plan: {
    name: 'الخطة المتميزة',
    description: 'جميع الميزات المتقدمة لمدة سنة',
    features: ['إشارات غير محدودة', 'تحليل متقدم لجميع الأسواق', 'روبوت تداول آلي', 'دعم فني مخصص', 'تدريب شخصي']
  }
};

export default function TelegramMiniApp() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // استرجاع معلومات المستخدم من Telegram WebApp
  useEffect(() => {
    // التحقق من تحميل SDK تلجرام
    const initTelegramWebApp = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        try {
          // إخبار تلجرام أن التطبيق جاهز
          window.Telegram.WebApp.ready();

          // استخراج معلومات المستخدم من initDataUnsafe
          if (window.Telegram.WebApp.initDataUnsafe?.user) {
            setTelegramUser(window.Telegram.WebApp.initDataUnsafe.user);
          }

          // تهيئة زر الرجوع
          window.Telegram.WebApp.BackButton.hide();

          setIsInitialized(true);
          
          console.log('تم تهيئة Telegram WebApp بنجاح');
        } catch (error) {
          console.error('خطأ في تهيئة Telegram WebApp:', error);
          toast({
            title: 'خطأ في التهيئة',
            description: 'حدث خطأ أثناء تهيئة التطبيق المصغر',
            variant: 'destructive'
          });
        }
      } else {
        console.warn('Telegram WebApp SDK غير متاح. ربما لا يتم فتح الصفحة داخل تطبيق تلجرام.');
      }
    };

    initTelegramWebApp();

    // تنظيف عند فك التثبيت
    return () => {
      if (window.Telegram?.WebApp) {
        // إلغاء أي أحداث مسجلة
        const mainButtonHandler = () => {};
        window.Telegram.WebApp.MainButton.offClick(mainButtonHandler);
      }
    };
  }, [toast]);

  // معالجة اختيار الخطة
  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    
    // إظهار زر الدفع الرئيسي في واجهة تلجرام
    if (window.Telegram?.WebApp?.MainButton) {
      window.Telegram.WebApp.MainButton.text = `الدفع (${PLAN_PRICES[planId as keyof typeof PLAN_PRICES]} نجمة)`;
      window.Telegram.WebApp.MainButton.onClick(() => handlePayment(planId));
      window.Telegram.WebApp.MainButton.show();
    }
  };

  // معالجة عملية الدفع
  const handlePayment = (planId: string) => {
    try {
      const starsAmount = PLAN_PRICES[planId as keyof typeof PLAN_PRICES];
      const paymentId = `tgmini_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // إعداد بيانات الدفع
      const paymentData = {
        planId,
        starsAmount,
        paymentId,
        telegramUserId: telegramUser?.id,
        username: telegramUser?.username || 'guest',
        timestamp: Date.now()
      };
      
      console.log('معالجة الدفع بنجوم تلجرام:', paymentData);
      
      // إرسال البيانات إلى تطبيق تلجرام الأم
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(paymentData));
        
        toast({
          title: 'تمت المعالجة',
          description: 'تم إرسال طلب الدفع بنجاح. يرجى إكمال العملية في تلجرام.',
          duration: 3000
        });
      } else {
        // في حالة الاختبار خارج تلجرام
        toast({
          title: 'وضع الاختبار',
          description: 'تم محاكاة عملية الدفع بنجاح.',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('خطأ في معالجة الدفع:', error);
      toast({
        title: 'خطأ في الدفع',
        description: 'حدث خطأ أثناء معالجة عملية الدفع. يرجى المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4" dir="rtl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-2">اشتراكات BinarJoinAnalytic</h1>
        <p className="text-muted-foreground">
          اختر الخطة المناسبة لاحتياجاتك وادفع باستخدام نجوم تلجرام
        </p>
      </div>

      {telegramUser && (
        <div className="bg-accent/30 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <span className="text-lg font-bold">{telegramUser.first_name?.charAt(0)}</span>
            </div>
            <div>
              <p className="font-medium">{telegramUser.first_name} {telegramUser.last_name}</p>
              {telegramUser.username && <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {Object.entries(PLAN_INFO).map(([planId, plan]) => (
          <Card 
            key={planId} 
            className={`border-2 hover:shadow-md transition-all ${selectedPlan === planId ? 'border-primary' : 'border-border'}`}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4 flex items-center">
                <span className="text-yellow-500 mr-2">⭐</span>
                {PLAN_PRICES[planId as keyof typeof PLAN_PRICES]} نجمة
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>المميزات:</Label>
                <ul className="space-y-1 list-disc list-inside">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-sm">{feature}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handlePlanSelection(planId)}
                variant={selectedPlan === planId ? "default" : "outline"}
              >
                {selectedPlan === planId ? 'الخطة المختارة ✓' : 'اختر هذه الخطة'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!isInitialized && (
        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-yellow-600 dark:text-yellow-400">
            يرجى التأكد من فتح هذه الصفحة من خلال تطبيق تلجرام للحصول على أفضل تجربة.
          </p>
        </div>
      )}
    </div>
  );
}