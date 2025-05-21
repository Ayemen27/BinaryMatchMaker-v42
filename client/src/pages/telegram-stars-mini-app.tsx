import React, { useEffect, useState } from 'react';
import { TelegramPaymentButton } from '@/components/telegram-payment-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// خطط الاشتراك المتاحة
const subscriptionPlans = [
  {
    id: 'weekly',
    name: 'الخطة الأسبوعية',
    description: 'تحليل أساسي للسوق في الوقت الحقيقي',
    price: 750,
    priceLabel: '750 نجمة',
    period: 'أسبوع واحد',
    featuresAr: [
      'تحليل أساسي للسوق',
      'إشارات التداول الأساسية',
      'تنبيهات السعر',
      'التحديثات اليومية'
    ],
    botVersion: 'BinarJoinAnalytic Main v2.0'
  },
  {
    id: 'monthly',
    name: 'الخطة الشهرية',
    description: 'تحليل فني متقدم للسوق + إشارات تداول',
    price: 2300,
    priceLabel: '2300 نجمة',
    period: 'شهر كامل',
    featuresAr: [
      'كل مميزات الخطة الأسبوعية',
      'تحليل فني متقدم',
      'مؤشرات فنية خاصة',
      'تنبيهات متقدمة',
      'دعم فني متميز'
    ],
    botVersion: 'BinarJoinAnalytic AI v3.0',
    popular: true
  },
  {
    id: 'annual',
    name: 'الخطة السنوية',
    description: 'تحليل مدعوم بالذكاء الاصطناعي + استراتيجيات مخصصة',
    price: 10000,
    priceLabel: '10000 نجمة',
    period: 'سنة كاملة',
    featuresAr: [
      'كل مميزات الخطة الشهرية',
      'تحليل بالذكاء الاصطناعي',
      'استراتيجيات مخصصة',
      'إشارات حصرية',
      'دعم على مدار الساعة',
      'جلسات استشارية شهرية'
    ],
    botVersion: 'BinarJoinAnalytic AI v3.0'
  },
  {
    id: 'premium',
    name: 'خطة BinarJoin V.4.1',
    description: 'أحدث إصدار مع تحليل متطور وإشارات دقيقة',
    price: 18500,
    priceLabel: '18500 نجمة',
    period: 'سنة كاملة',
    featuresAr: [
      'إصدار الذكاء الاصطناعي المتطور',
      'دقة عالية في الإشارات (95%+)',
      'تحليل فوري للتغيرات السوقية',
      'إشارات حصرية غير متاحة في باقي الخطط',
      'دعم VIP على مدار الساعة',
      'استشارات خاصة أسبوعية',
      'وصول حصري لاستراتيجيات متقدمة'
    ],
    botVersion: 'BinarJoinAnalytic V.4.1'
  }
];

export default function TelegramStarsMiniApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // التحقق من وجود التطبيق في بيئة تلجرام
  useEffect(() => {
    // تطبيق الوضع الداكن بناءً على إعدادات تلجرام
    if (window.Telegram?.WebApp) {
      setIsInTelegram(true);
      // التحقق من العنصر colorScheme إذا كان موجوداً
      const darkMode = window.Telegram.WebApp.hasOwnProperty('colorScheme') 
        ? (window.Telegram.WebApp as any).colorScheme === 'dark'
        : false;
      setIsDarkMode(darkMode);
      
      // تهيئة واجهة التطبيق
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // تغيير وضع الألوان
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // اختيار خطة
  const handleSelectPlan = (planId: string) => {
    setActivePlanId(planId);
  };

  // معالج بدء عملية الدفع
  const handlePaymentInitiated = () => {
    // نظهر رسالة تأكيد أو نقوم بتوجيه المستخدم
    console.log('تم بدء عملية الدفع');
  };

  return (
    <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className="mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">BinarJoin Analytics</h1>
          <div className="flex items-center gap-2">
            <Label htmlFor="dark-mode" className="text-sm">
              {isDarkMode ? 'وضع داكن' : 'وضع فاتح'}
            </Label>
            <Switch
              id="dark-mode"
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isInTelegram ? 'تطبيق تلجرام المصغر - الدفع بالنجوم' : 'محاكاة تطبيق تلجرام - الدفع بالنجوم'}
        </p>
      </header>

      <main dir="rtl">
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">اختر خطة الاشتراك المناسبة</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            جميع الخطط تشمل إشارات تداول وتحليلات فنية للسوق
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptionPlans.map((plan) => (
            <Card 
              key={plan.id}
              className={`border-2 transition-all ${
                plan.popular 
                  ? 'border-blue-500 dark:border-blue-400 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700'
              } ${
                activePlanId === plan.id 
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-500 text-white text-xs px-4 py-1 text-center">
                  الأكثر طلباً
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold">{plan.priceLabel}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{plan.period}</span>
                </div>
                <Separator className="mb-4" />
                <ul className="space-y-2">
                  {plan.featuresAr.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor" 
                        className="w-5 h-5 text-green-500"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  <p className="text-xs mb-2 text-gray-500 dark:text-gray-400">
                    إصدار الروبوت: {plan.botVersion}
                  </p>
                  <TelegramPaymentButton
                    planId={plan.id}
                    botVersion={plan.botVersion}
                    price={plan.price}
                    onPaymentInitiated={handlePaymentInitiated}
                  />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>جميع الحقوق محفوظة © BinarJoin Analytics {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}