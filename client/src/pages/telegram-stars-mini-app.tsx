import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet';
import { 
  Check, Star, Shield, Award, Medal, Loader2, Zap, 
  AlertCircle, Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
    premium: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0', 'BinarJoinAnalytic V.4.1']
  };
  
  // بنية خطط الاشتراك مع مزيد من التفاصيل والميزات
  const plans = [
    {
      id: 'weekly',
      name: t('beginner'),
      label: t('weeklyPlan'),
      price: `${planPrices.weekly.STARS}`,
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
    } else {
      console.warn('Telegram WebApp SDK غير متاح. ربما التطبيق لا يعمل داخل تطبيق تلجرام.');
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
  
  // اختيار خطة
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
    
    // تحديث زر تلجرام الرئيسي
    if (telegramWebApp?.MainButton) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        telegramWebApp.MainButton.setText(`${t('payWithStars')} (${plan.price} ${t('stars')})`);
        telegramWebApp.MainButton.show();
        telegramWebApp.MainButton.onClick(() => handlePayment(planId));
      }
    }
  };
  
  // معالجة الدفع
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
        telegramWebApp.sendData(JSON.stringify(paymentData));
        console.log('تم إرسال بيانات الدفع بنجاح إلى تلجرام');
        
        // إظهار رسالة نجاح
        toast({
          title: t('paymentInitiated'),
          description: t('paymentInitiatedDescription'),
          variant: 'default',
        });
        
        // إخفاء شاشة التحميل بعد إرسال البيانات بنجاح
        setTimeout(() => {
          setIsProcessing(false);
          // إغلاق تطبيق تلجرام المصغر بعد نجاح الدفع
          telegramWebApp.close();
        }, 1500);
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
              title: t('paymentInitiated'),
              description: t('redirectingToTelegram'),
              variant: 'default'
            });
            
            // إنشاء رابط للبوت مع جميع المعلومات المطلوبة
            const telegramBotUrl = `https://t.me/Payment_gateway_Binar_bot?start=pay_${planId}_${starsAmount}_${paymentId}`;
            
            // توجيه المستخدم إلى بوت تلجرام
            window.location.href = telegramBotUrl;
          } else {
            toast({
              title: t('errorOccurred'),
              description: data.message || t('paymentProcessingFailed'),
              variant: 'destructive'
            });
          }
        })
        .catch(error => {
          console.error('خطأ في معالجة الدفع:', error);
          setIsProcessing(false);
          toast({
            title: t('connectionError'),
            description: t('checkInternetConnection'),
            variant: 'destructive'
          });
        });
      }
    } catch (error) {
      console.error('خطأ في إرسال بيانات الدفع:', error);
      setIsProcessing(false);
      toast({
        title: t('errorOccurred'),
        description: t('paymentProcessingFailed'),
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>BinarJoin Analytics | {t('subscriptionPlans')}</title>
        <meta name="description" content={t('subscriptionMetaDescription')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>
      
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-2">{t('tradingSignalSubscriptionPlans')}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t('professionalTradingInsights')}</p>
      </div>

      {telegramUser && (
        <div className="bg-accent/30 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <span className="text-lg font-bold">{telegramUser.first_name ? telegramUser.first_name.charAt(0) : 'U'}</span>
            </div>
            <div>
              <p className="font-medium">
                {telegramUser.first_name || ''} {telegramUser.last_name || ''}
              </p>
              {telegramUser.username && <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>}
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-start">
        <Info className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
        <div>
          <p className="text-sm">{t('telegramStarsOnlyInfo')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`border-2 hover:shadow-md transition-all ${selectedPlan === plan.id ? 'border-primary' : 'border-border'}`}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.label}</CardDescription>
                </div>
                {plan.isPopular && (
                  <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                    {t('mostPopular')}
                  </Badge>
                )}
                {plan.isNew && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    {t('newPlan')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="mb-4 flex items-center">
                <div className="text-2xl font-bold text-primary flex items-center">
                  <Star className="h-5 w-5 mr-1 text-yellow-500" />
                  {plan.price} <span className="text-sm mr-1">{t('stars')}</span>
                </div>
                <span className="text-sm text-muted-foreground mr-auto">{`/${plan.period}`}</span>
              </div>
              
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              {plan.extraDescription && (
                <p className="text-sm text-muted-foreground mb-4 italic">{plan.extraDescription}</p>
              )}
              
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">{t('selectBotVersion')}</label>
                <Select
                  value={selectedBotVersions[plan.id] || ''}
                  onValueChange={(value) => handleBotVersionChange(plan.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectVersion')} />
                  </SelectTrigger>
                  <SelectContent>
                    {plan.botVersions.map((version) => (
                      <SelectItem key={version} value={version}>
                        {version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
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
            
            <CardFooter className="pt-2 pb-4 px-6 flex flex-col">
              <div className="ideal-for mb-3 flex items-center justify-center text-center text-sm text-muted-foreground">
                {plan.id === 'monthly' && (
                  <Zap className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                )}
                {plan.id === 'premium' && (
                  <Star className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                )}
                <span>{plan.idealFor}</span>
              </div>
              
              <Button 
                className="w-full bg-amber-400 hover:bg-amber-500 text-black"
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isProcessing}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    {plan.callToAction}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="note text-center text-sm text-muted-foreground mb-6">
        <div className="flex items-center justify-center mb-2">
          <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
          <p>{t('telegramStarsPaymentNote')}</p>
        </div>
        <p>{t('subscriptionTermsNote')}</p>
      </div>
    </div>
  );
}