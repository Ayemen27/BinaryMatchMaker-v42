import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet';
import { Check, Star, Shield, Award, Medal, Loader2, Zap, Info, DollarSign, X, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { LoadingScreen } from '@/components/telegram/loading-screen';
import { TelegramHeader } from '@/components/telegram/header';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import '../styles/subscription.css';
import '../styles/telegram-mini-app.css';

// تعريف واجهة لمعلومات مستخدم تيليجرام
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export default function TelegramStarsMiniApp() {
  const { t, i18n } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramWebApp, setTelegramWebApp] = useState<any>(null);
  const [selectedBotVersions, setSelectedBotVersions] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [userStars, setUserStars] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  
  // أسعار الخطط المختلفة - نستخدم فقط أسعار النجوم هنا
  const planPrices = {
    weekly: { STARS: 750 },
    monthly: { STARS: 2300 },
    annual: { STARS: 10000 },
    premium: { STARS: 18500 }
  };
  
  // إصدارات الروبوت المتاحة لكل خطة
  const botVersions = {
    weekly: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0'],
    monthly: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0'],
    annual: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0'],
    premium: ['BinarJoinAnalytic V.4.1'] // تحديث لاستخدام إصدار 4.1 فقط
  };
  
  // بنية خطط الاشتراك
  const plans = [
    {
      id: 'weekly',
      name: t('beginner'),
      label: t('weeklyPlan'),
      price: `${planPrices.weekly.STARS}`,
      priceInUSD: 750,
      period: t('weekly'),
      description: t('realTimeAnalysis'),
      color: 'from-amber-400 to-yellow-500',
      icon: <Shield className="h-4 w-4" />,
      botVersions: botVersions.weekly,
      features: [
        { text: t('realTimeFundamentalAnalysis'), available: true },
        { text: t('keyTradingSignals'), available: true },
        { text: t('dailyMarketUpdates'), available: true },
        { text: t('beginnerFriendlyTools'), available: true },
        { text: t('privateTelegramAccess'), available: true },
        { text: t('prioritySupport'), available: true },
      ],
      idealFor: t('idealForBeginners'),
      isPopular: false,
      callToAction: t('subscribeNow'),
      disabled: false,
    },
    {
      id: 'monthly',
      name: t('recommended'),
      label: t('monthlyPlan'),
      price: `${planPrices.monthly.STARS}`,
      priceInUSD: 2300,
      period: t('monthly'),
      description: t('advancedTechnicalAnalysis'),
      color: 'from-amber-400 to-yellow-500',
      icon: <Star className="h-4 w-4" />,
      botVersions: botVersions.monthly,
      features: [
        { text: t('professionalTechnicalAnalysis'), available: true },
        { text: t('instantMarketAlerts'), available: true },
        { text: t('customPairAnalysis'), available: true },
        { text: t('weeklyPerformanceReports'), available: true },
        { text: t('educationalContentAccess'), available: true },
        { text: t('directExpertSupport'), available: true },
      ],
      idealFor: t('perfectForActiveTraders'),
      isPopular: true,
      callToAction: t('upgradeMyTrading'),
      disabled: false,
    },
    {
      id: 'annual',
      name: t('premium'),
      label: t('annualPlan'),
      price: `${planPrices.annual.STARS}`,
      priceInUSD: 10000,
      period: t('yearly'),
      description: t('aiPoweredAnalysis'),
      color: 'from-amber-400 to-yellow-500',
      icon: <Award className="h-4 w-4" />,
      botVersions: botVersions.annual,
      features: [
        { text: t('aiPoweredTrendPrediction'), available: true },
        { text: t('customTradingStrategies'), available: true },
        { text: t('advancedMarketReports'), available: true },
        { text: t('vipSupport'), available: true },
        { text: t('partialRefundGuarantee'), available: true },
        { text: t('advancedTradingTools'), available: true },
      ],
      idealFor: t('designedForProfessionals'),
      isPopular: false,
      callToAction: t('unlockProTrading'),
      disabled: false,
    },
    {
      id: 'premium',
      name: t('premiumData'),
      label: t('premiumAnnualPlan'),
      price: `${planPrices.premium.STARS}`,
      priceInUSD: 18500,
      period: t('yearly'),
      description: t('newBinarJoinVersion'),
      color: 'from-amber-400 to-yellow-500',
      icon: <Medal className="h-4 w-4" />,
      botVersions: ['BinarJoinAnalytic V.4.1'],
      features: [
        { text: t('advancedMarketAnalysis'), available: true },
        { text: t('botSupportedTradingSignals'), available: true },
        { text: t('ultraFastMarketInsights'), available: true },
        { text: t('exclusiveStrategies'), available: true },
        { text: t('dedicatedAccountManager'), available: true },
        { text: t('prioritySignalDelivery'), available: true },
      ],
      idealFor: t('idealForV41'),
      isPopular: false,
      callToAction: t('getPremiumDataAccess'),
      disabled: false,
      isNew: true,
      extraDescription: t('v41ExtraDescription')
    }
  ];
  
  // تحميل واجهة برمجة تطبيقات تلجرام
  useEffect(() => {
    // إنشاء نسخة مؤقتة من بيانات المستخدم للعرض التجريبي
    const demoUser = {
      id: 12345678,
      first_name: "مستخدم",
      last_name: "تلجرام",
      username: "telegram_user",
      language_code: "ar"
    };
    
    // في البيئة التجريبية، استخدم بيانات المستخدم المؤقتة
    if (process.env.NODE_ENV === 'development') {
      setTelegramUser(demoUser);
    }
    
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
        text: t('selectPlan'),
        color: tgWebApp.themeParams.button_color || '#ffcd00',
        text_color: tgWebApp.themeParams.button_text_color || '#333333',
        is_visible: false
      });
      
      // إضافة الداكن إذا كان وضع تلجرام داكناً
      if (tgWebApp.colorScheme === 'dark') {
        document.body.classList.add('dark');
      }
      
      // إخفاء شاشة التحميل بعد تهيئة تطبيق تيليجرام بنجاح
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } else {
      // في حالة عدم وجود SDK تيليجرام، نعرض الصفحة في وضع العرض التجريبي
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [t]);
  
  // تعيين الإصدارات الافتراضية للروبوت
  useEffect(() => {
    const defaultVersions: {[key: string]: string} = {};
    plans.forEach(plan => {
      if (plan.botVersions && plan.botVersions.length > 0) {
        defaultVersions[plan.id] = plan.botVersions[0];
      }
    });
    setSelectedBotVersions(defaultVersions);
  }, []);
  
  // تحديث إصدار الروبوت المختار
  const handleBotVersionChange = (planId: string, version: string) => {
    setSelectedBotVersions(prev => ({
      ...prev,
      [planId]: version
    }));
  };
  
  // اختيار خطة - آلية مباشرة بدون نافذة منبثقة
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    
    // التحقق من إصدار الروبوت المحدد
    if (!selectedBotVersions[planId]) {
      toast({
        title: t('botVersionRequired'),
        description: t('pleasSelectBotVersion'),
        variant: 'destructive',
      });
      return;
    }
    
    // معالجة الدفع مباشرة
    handlePayment(planId);
  };
  
  // معالجة الدفع - طريقة مباشرة بدون نافذة منبثقة
  const handlePayment = (planId: string) => {
    if (!planId || isProcessing) return;
    
    setIsProcessing(true);
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      setIsProcessing(false);
      return;
    }
    
    const botVersion = selectedBotVersions[planId];
    const starsAmount = planPrices[planId as keyof typeof planPrices].STARS;
    
    // إنشاء معرف فريد للدفع
    const paymentId = `tgstars_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // تجهيز بيانات الدفع
    const paymentData = {
      action: 'process_stars_payment',
      paymentId,
      planId: planId,
      botVersion,
      starsAmount,
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
        // عرض علامة التقدم على الزر الرئيسي
        if (telegramWebApp.MainButton) {
          telegramWebApp.MainButton.showProgress(true);
        }
        
        // إرسال البيانات مباشرة إلى تيليجرام
        telegramWebApp.sendData(JSON.stringify(paymentData));
        console.log('تم إرسال بيانات الدفع بنجاح إلى تلجرام');
        
        // إظهار رسالة نجاح
        toast({
          title: t('paymentInitiated'),
          description: t('paymentInitiatedDescription'),
        });
        
        // إعادة تعيين حالة المعالجة
        setTimeout(() => {
          setIsProcessing(false);
          setSelectedPlan(null);
          
          // إعادة تعيين الزر الرئيسي
          if (telegramWebApp.MainButton) {
            telegramWebApp.MainButton.hideProgress();
            telegramWebApp.MainButton.hide();
          }
        }, 1500);
      } else if (process.env.NODE_ENV === 'development') {
        // وضع تجريبي في بيئة التطوير
        console.log('وضع التطوير: محاكاة إرسال البيانات', paymentData);
        
        // إظهار رسالة نجاح تجريبية
        toast({
          title: 'تمت محاكاة الدفع بنجاح',
          description: 'هذه رسالة تجريبية فقط في بيئة التطوير. في البيئة الحقيقية، سيتم إرسال البيانات إلى تلجرام.',
        });
        
        // إعادة تعيين حالة المعالجة
        setTimeout(() => {
          setIsProcessing(false);
          setSelectedPlan(null);
        }, 1500);
      } else {
        // في حالة عدم وجود SDK تلجرام، نعرض رسالة خطأ
        console.error('لم يتم العثور على Telegram SDK');
        toast({
          title: t('errorOccurred'),
          description: t('telegramSdkNotFound'),
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('خطأ في إرسال البيانات:', error);
      toast({
        title: t('errorOccurred'),
        description: t('paymentProcessError'),
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  // عرض صفحة التحميل
  if (isLoading) {
    return (
      <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <Helmet>
          <title>BinarJoin Analytics | {t('loading')}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        </Helmet>
        <LoadingScreen t={t} />
      </div>
    );
  }

  // عرض واجهة المستخدم الرئيسية
  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>BinarJoin Analytics | {t('subscriptionPlans')}</title>
        <meta name="description" content={t('subscriptionMetaDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>
      
      {/* تم إزالة النافذة المنبثقة واستبدالها بتجربة دفع مباشرة */}
      
      {/* شريط علوي */}
      <TelegramHeader telegramUser={telegramUser} i18n={i18n} t={t} />
      
      <div className="container max-w-sm mx-auto py-6 px-2 mt-16">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold mb-1">{t('tradingSignalSubscriptionPlans')}</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">{t('professionalTradingInsights')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`border-none bg-yellow-50 rounded-lg overflow-hidden shadow-sm mb-5 ${selectedPlan === plan.id ? 'ring-2 ring-yellow-500' : ''}`}
            >
              {plan.isNew && (
                <div className="absolute top-0 left-0 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-tr-md">
                  !NEW
                </div>
              )}
              
              <CardHeader className="pb-0 pt-4 px-4 text-center">
                <div className="flex justify-center items-center mb-2">
                  {plan.id === 'premium' && (
                    <div className="bg-yellow-400 text-xs font-medium py-1 px-3 rounded-full text-black">
                      موصى بها
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl font-bold text-center mb-1">{plan.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="px-4 py-2 flex flex-col items-center">
                <div className="text-3xl font-bold text-yellow-500 flex items-center mb-3">
                  <span className="text-sm ml-1">⭐</span>
                  <span className="">{plan.price}</span>
                </div>
                
                <p className="text-sm text-center mb-3">{plan.description}</p>
                
                <div className="w-full mb-4">
                  <Select
                    value={selectedBotVersions[plan.id] || plan.botVersions[0] || ''}
                    onValueChange={(value) => handleBotVersionChange(plan.id, value)}
                  >
                    <SelectTrigger className="w-full bg-white border-gray-200 text-right">
                      <SelectValue placeholder="اختر إصدار الروبوت" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {plan.botVersions && plan.botVersions.map((version) => (
                        <SelectItem key={version} value={version}>
                          {version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* قسم الميزات المميزة للخطة المتميزة */}
                {plan.id === 'premium' && (
                  <div className="bg-yellow-100 border border-yellow-200 p-3 rounded-lg mb-4 w-full">
                    <div className="flex justify-between items-center mb-2">
                      <span className="inline-block bg-red-500 text-white text-xs font-bold py-0.5 px-2 rounded-sm">جديد!</span>
                      <div className="text-right font-bold text-sm">
                        جديداً! - Binar Join Analytic V.4.1 ثورة إشارات التداول
                      </div>
                      <span className="text-red-500 text-xl">🔴</span>
                    </div>
                    
                    <p className="text-right text-sm mb-2">
                      🚀 إشارات دقيقة، قرارات أكثر ذكاءً مع Binar Join Analytic V.4.1 الجديد. احصل على إشارات محدثة دقيقة ومناسبة لمساعدتك على اتخاذ قرارات استثمارية ناجحة.
                    </p>
                    
                    <div className="text-right font-semibold mb-2 text-sm">لماذا Binar Join Analytic V.4.1؟</div>
                    
                    <ul className="text-right text-sm space-y-2">
                      <li className="flex justify-end items-center gap-2">
                        <span>محسن بتقنية الذكاء الاصطناعي للدقة العالية</span>
                        <Check className="h-4 w-4 text-yellow-600" />
                      </li>
                      <li className="flex justify-end items-center gap-2">
                        <span>تحليل البيانات المتقدم ومعالجتها في الوقت الفعلي</span>
                        <Check className="h-4 w-4 text-yellow-600" />
                      </li>
                      <li className="flex justify-end items-center gap-2">
                        <span>يقلل من احتمالية الخسارة بشكل كبير</span>
                        <Check className="h-4 w-4 text-yellow-600" />
                      </li>
                    </ul>
                  </div>
                )}
                
                {/* قسم ميزات الخطة */}
                <div className="w-full">
                  <h4 className="text-lg font-medium text-center mb-2 border-b border-yellow-200 pb-1">ميزات متقدمة</h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex justify-end items-center py-1.5 text-right">
                      <span className="text-sm">
                        {feature.text}
                      </span>
                      <Check className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
              
              <CardFooter className="px-4 pb-4 pt-2 flex flex-col">
                <div className="text-center bg-yellow-100 py-2 px-3 rounded-lg text-sm text-gray-700 w-full mb-3 flex items-center justify-center">
                  <span className="text-yellow-600 ml-1">⚡</span>
                  {plan.idealFor}
                </div>
                
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2"
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isProcessing}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="mx-2 h-4 w-4 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      {plan.callToAction}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* تذييل الصفحة */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 text-center text-xs text-muted-foreground">
          <p>{t('poweredBy')} BinarJoin Analytics &copy; 2025</p>
        </div>
      </div>
      
      {/* حوار معلومات الحساب */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{t('accountInfo')}</DialogTitle>
            <DialogDescription className="text-center">{t('yourCurrentInfo')}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-3 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('username')}:</span>
              <span className="font-medium">{username || t('notAvailable')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('stars')}:</span>
              <span className="font-medium">{userStars || '0'} ⭐</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('currentPlan')}:</span>
              <span className="font-medium">{currentPlan || t('none')}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}