import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star, Zap, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import '../styles/telegram-mini-app.css';

// معلومات الخطط
const PLAN_INFO = {
  weekly: {
    id: 'weekly',
    name: 'الخطة الأسبوعية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة أسبوع',
    price: 750,
    badge: null,
    features: [
      { text: '10 إشارات يوميًا' },
      { text: 'تحليل سوق الفوركس' },
      { text: 'دعم الخيارات الثنائية' },
      { text: 'تنبيهات أساسية' }
    ],
    idealFor: 'للمتداولين المبتدئين',
    callToAction: 'اختر الخطة الأسبوعية'
  },
  monthly: {
    id: 'monthly',
    name: 'الخطة الشهرية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة شهر',
    price: 2300,
    badge: { text: 'الأكثر شعبية', color: 'bg-yellow-500' },
    features: [
      { text: '25 إشارة يوميًا' },
      { text: 'تحليل سوق الفوركس والعملات الرقمية' },
      { text: 'دعم الخيارات الثنائية' },
      { text: 'تنبيهات فورية' },
      { text: 'تحليلات السوق الأسبوعية' }
    ],
    idealFor: 'للمتداولين النشطين',
    callToAction: 'اختر الخطة الشهرية'
  },
  annual: {
    id: 'annual',
    name: 'الخطة السنوية',
    description: 'تحليلات متقدمة وإشارات تداول لمدة سنة',
    price: 10000,
    badge: { text: 'أفضل قيمة', color: 'bg-green-500' },
    features: [
      { text: '50 إشارة يوميًا' },
      { text: 'تحليل جميع الأسواق' },
      { text: 'دعم الخيارات الثنائية والعقود' },
      { text: 'تنبيهات فورية' },
      { text: 'دعم فني على مدار الساعة' },
      { text: 'تقارير تحليلية شهرية' },
      { text: 'استراتيجيات متقدمة' }
    ],
    idealFor: 'للمتداولين المحترفين',
    callToAction: 'اختر الخطة السنوية'
  },
  premium: {
    id: 'premium',
    name: 'الخطة المتميزة',
    description: 'جميع الميزات المتقدمة لمدة سنة',
    price: 18500,
    badge: null,
    features: [
      { text: 'إشارات غير محدودة' },
      { text: 'تحليل متقدم لجميع الأسواق' },
      { text: 'روبوت تداول آلي' },
      { text: 'دعم فني مخصص' },
      { text: 'تدريب شخصي' },
      { text: 'استراتيجيات خاصة' },
      { text: 'تقارير مخصصة' },
      { text: 'مجتمع المتداولين المميزين' }
    ],
    idealFor: 'للمتداولين المتقدمين والمؤسسات',
    callToAction: 'اختر الخطة المتميزة'
  }
};

// واجهة لمعلومات مستخدم تلجرام
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

// تطبيق تلجرام المصغر
export default function TelegramMiniApp() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramWebApp, setTelegramWebApp] = useState<any>(null);
  
  // تحميل واجهة برمجة تطبيقات تلجرام
  useEffect(() => {
    const tgWebApp = (window as any).Telegram?.WebApp;
    
    if (tgWebApp) {
      console.log('تم اكتشاف Telegram WebApp SDK');
      setTelegramWebApp(tgWebApp);
      
      // إخبار تطبيق تلجرام أن التطبيق جاهز
      tgWebApp.ready();
      
      // الحصول على معلومات المستخدم
      if (tgWebApp.initDataUnsafe?.user) {
        setTelegramUser(tgWebApp.initDataUnsafe.user);
      }
      
      // تكوين سلوك الزر الرئيسي
      tgWebApp.MainButton.setParams({
        text: 'اختر خطة للاشتراك',
        color: tgWebApp.themeParams.button_color || '#50a8eb',
        text_color: tgWebApp.themeParams.button_text_color || '#ffffff',
        is_visible: false
      });
      
      // إضافة الداكن إذا كان وضع تلجرام داكناً
      if (tgWebApp.colorScheme === 'dark') {
        document.body.classList.add('dark');
      }
    } else {
      console.warn('Telegram WebApp SDK غير متاح. ربما التطبيق لا يعمل داخل تطبيق تلجرام.');
    }
  }, []);
  
  // اختيار خطة
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    
    // تحديث زر تلجرام الرئيسي
    if (telegramWebApp?.MainButton) {
      const plan = PLAN_INFO[planId as keyof typeof PLAN_INFO];
      telegramWebApp.MainButton.setText(`الدفع (${plan.price} نجمة)`);
      telegramWebApp.MainButton.show();
      telegramWebApp.MainButton.onClick(() => handlePayment(planId));
    }
  };
  
  // معالجة الدفع
  const handlePayment = (planId: string) => {
    if (!planId) return;
    
    setIsProcessing(true);
    const plan = PLAN_INFO[planId as keyof typeof PLAN_INFO];
    
    // إنشاء معرف فريد للدفع
    const paymentId = `tgmini_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // تجهيز بيانات الدفع
    const paymentData = {
      action: 'process_stars_payment',
      paymentId,
      planId: planId,
      starsAmount: plan.price,
      timestamp: Date.now()
    };
    
    // إضافة معلومات المستخدم إذا كانت متاحة
    if (telegramUser) {
      Object.assign(paymentData, {
        userId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name
      });
    }
    
    console.log('بيانات الدفع:', paymentData);
    
    try {
      // إرسال البيانات مباشرة إلى تطبيق تلجرام
      if (telegramWebApp) {
        telegramWebApp.sendData(JSON.stringify(paymentData));
        console.log('تم إرسال بيانات الدفع بنجاح إلى تلجرام');
        
        // إخفاء شاشة التحميل بعد إرسال البيانات بنجاح
        setTimeout(() => {
          setIsProcessing(false);
        }, 800);
      } else {
        // في حالة التشغيل خارج تلجرام، نرسل الطلب إلى الخادم
        fetch('/api/telegram-payments/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        })
        .then(response => response.json())
        .then(data => {
          setIsProcessing(false);
          if (data.success) {
            toast({
              title: 'تمت معالجة الطلب بنجاح',
              description: 'سيتم توجيهك إلى تلجرام لإكمال الدفع',
              variant: 'default'
            });
            
            // توجيه المستخدم إلى بوت تلجرام
            window.location.href = `https://t.me/OXG_OXG?start=pay_${planId}_${paymentId}`;
          } else {
            toast({
              title: 'حدث خطأ',
              description: data.message || 'فشلت معالجة الطلب. يرجى المحاولة مرة أخرى.',
              variant: 'destructive'
            });
          }
        })
        .catch(error => {
          console.error('خطأ في معالجة الدفع:', error);
          setIsProcessing(false);
          toast({
            title: 'حدث خطأ في الاتصال',
            description: 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.',
            variant: 'destructive'
          });
        });
      }
    } catch (error) {
      console.error('خطأ في إرسال بيانات الدفع:', error);
      setIsProcessing(false);
      toast({
        title: 'حدث خطأ',
        description: 'فشلت معالجة الطلب. يرجى المحاولة مرة أخرى.',
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
              <div className="flex justify-between items-center">
                <div className="text-xl font-bold text-primary flex items-center">
                  <Star className="h-5 w-5 mr-1 text-yellow-500" />
                  {plan.price} <span className="text-sm mr-1">نجمة</span>
                </div>
                {plan.badge && (
                  <div className={`text-xs text-white px-2 py-1 rounded-full text-center ${plan.badge.color}`}>
                    {plan.badge.text}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="feature-text">
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter className="pt-2 pb-4 px-3 flex flex-col">
              <div className="ideal-for mb-3 flex items-center justify-center text-center text-sm">
                {plan.id === 'monthly' && (
                  <Zap className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                )}
                {plan.id === 'premium' && (
                  <Star className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                )}
                <span>{plan.idealFor}</span>
              </div>
              
              <Button 
                className="subscription-button"
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isProcessing}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  plan.callToAction
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="note text-center text-sm text-muted-foreground mb-4">
        <p>ملاحظة: سيتم معالجة الدفع عبر نجوم تلجرام مباشرة.</p>
      </div>
    </div>
  );
}