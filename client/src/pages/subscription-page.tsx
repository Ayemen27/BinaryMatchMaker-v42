import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Helmet } from 'react-helmet';
import { 
  Check, AlertCircle, CreditCard, Gem, Shield, Star, Zap, Medal, Loader2, 
  RefreshCw, DollarSign, LifeBuoy, Book, Smartphone, Award, ChevronDown,
  X, ArrowLeft, RefreshCcw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
// استيراد ملف الأنماط الخاص بصفحة الاشتراك
import '../styles/subscription.css';

export default function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'STARS'>('USD');
  const [selectedBotVersions, setSelectedBotVersions] = useState<{[key: string]: string}>({});
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'platforms' | 'wallets' | 'traditional'>('platforms');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // استعلام لجلب بيانات الاشتراك الحالي للمستخدم
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['/api/user/subscription'],
    enabled: !!user
  });
  
  // تنفيذ طلب ترقية الاشتراك
  const upgradeMutation = useMutation({
    mutationFn: async (data: { planType: string, botVersion: string, paymentMethod?: string }) => {
      const response = await fetch('/api/user/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('فشل في ترقية الاشتراك');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: t('subscriptionUpgraded'),
        description: t('subscriptionUpgradedDescription'),
        variant: 'default',
      });
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Error upgrading subscription:', error);
      toast({
        title: t('errorUpgradingSubscription'),
        description: t('errorUpgradingSubscriptionDescription'),
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  });
  
  // أسعار الخطط المختلفة
  const planPrices = {
    weekly: { USD: 9.99, STARS: 750 },
    monthly: { USD: 29.99, STARS: 2300 },
    annual: { USD: 149.99, STARS: 10000 },
    premium: { USD: 300, STARS: 18500 }
  };
  
  // إصدارات الروبوت المتاحة لكل خطة
  const botVersions = {
    weekly: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0'],
    monthly: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0'],
    annual: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0'],
    premium: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0']
  };
  
  // بنية خطط الاشتراك مع مزيد من التفاصيل والميزات
  const plans = [
    {
      id: 'weekly',
      name: t('beginner'),
      label: t('weeklyPlan'),
      price: currency === 'USD' ? `$${planPrices.weekly.USD}` : `${planPrices.weekly.STARS}`,
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
      price: currency === 'USD' ? `$${planPrices.monthly.USD}` : `${planPrices.monthly.STARS}`,
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
      price: currency === 'USD' ? `$${planPrices.annual.USD}` : `${planPrices.annual.STARS}`,
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
      price: currency === 'USD' ? `$${planPrices.premium.USD}` : `${planPrices.premium.STARS}`,
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
  
  // تغيير العملة
  const toggleCurrency = () => {
    setCurrency(prev => prev === 'USD' ? 'STARS' : 'USD');
  };
  
  // تحديث إصدار الروبوت المختار
  const handleBotVersionChange = (planId: string, version: string) => {
    setSelectedBotVersions(prev => ({
      ...prev,
      [planId]: version
    }));
  };
  
  // [تم الاستبدال بوظيفة المعالجة الذكية]
  
  // إغلاق نافذة طرق الدفع
  const closePaymentModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      setIsModalClosing(false);
    }, 300);
  };
  
  // تغيير طريقة الدفع
  const changePaymentTab = (tab: 'platforms' | 'wallets' | 'traditional') => {
    setPaymentTab(tab);
  };
  
  // اختيار طريقة الدفع
  const selectPaymentMethod = (method: string) => {
    // طرق الدفع المعطلة
    const disabledMethods = ['paypal', 'visa', 'mastercard', 'applepay', 'googlepay'];
    
    if (disabledMethods.includes(method)) {
      toast({
        title: t('paymentMethodDisabled'),
        description: t('paymentMethodDisabledDescription'),
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedPaymentMethod(method);
    processPayment(method);
  };
  
  // معالجة الدفع بعد اختيار الطريقة
  const processPayment = (method: string) => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);
    closePaymentModal();
    
    // إرسال بيانات الاشتراك
    setTimeout(() => {
      upgradeMutation.mutate({
        planType: selectedPlan,
        botVersion: selectedBotVersions[selectedPlan],
        paymentMethod: method
      });
    }, 1500);
  };
  
  /**
   * نظام ذكي معزز للتعامل مع طرق الدفع المختلفة
   * تم تعديله لضمان عدم ظهور النافذة المنبثقة في وضع الدفع بالنجوم
   * 
   * USD: تظهر النافذة المنبثقة مع خيارات الدفع التقليدية
   * STARS: توجّه المستخدم مباشرة لبوت تلجرام دون ظهور النافذة المنبثقة
   */
  const handleUpgrade = (planId: string) => {
    // التحقق من إصدار الروبوت المحدد أولاً
    if (!selectedBotVersions[planId] || selectedBotVersions[planId] === '_default') {
      toast({
        title: t('botVersionRequired'),
        description: t('pleasSelectBotVersion'),
        variant: 'destructive',
      });
      return;
    }

    // حفظ الخطة المختارة للاستخدام في معالجة الدفع
    setSelectedPlan(planId);
    
    // التسلسل المنطقي المختلف بناءً على العملة المحددة
    if (currency === 'USD') {
      // في حالة الدولار: استخدام النافذة المنبثقة الحالية
      setIsPaymentModalOpen(true);
      setPaymentTab('platforms');
      setSelectedPaymentMethod(null);
    } else {
      // في حالة النجوم: تنفيذ الدفع مباشرة عبر تلجرام
      processTelegramStarsPayment(planId);
    }
  };
  
  /**
   * معالجة الدفع المباشر بنجوم تلجرام
   * تتجاوز النافذة المنبثقة وتوجه المستخدم مباشرة لبوت تلجرام
   * مع تسجيل حالة الانتظار بدلاً من محاولة الترقية الفورية
   */
  const processTelegramStarsPayment = (planId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // إعداد بيانات الدفع
    const plan = plans.find(p => p.id === planId);
    const botVersion = selectedBotVersions[planId];
    const starsAmount = planPrices[planId as keyof typeof planPrices].STARS;
    
    // إنشاء معرف فريد للطلب
    const paymentId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // محاولة حفظ حالة الطلب محلياً
    try {
      localStorage.setItem('pendingStarsPayment', JSON.stringify({
        paymentId,
        planId,
        botVersion,
        starsAmount,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('فشل في حفظ حالة الطلب', e);
    }
    
    // إنشاء رابط تلجرام باستخدام البوت الصحيح وأمر بداية بسيط مع معلومات الخطة
    // إضافة معلومات الاشتراك إلى النص المرسل للبوت
    const paymentMessage = encodeURIComponent(
      `Stars Subscription Request\n\n` +
      `Plan: ${planId}\n` +
      `Stars: ${starsAmount}\n` +
      `User: ${user?.username || 'Guest'}\n` +
      `Time: ${new Date().toISOString()}`
    );
    
    // استخدام اسم المستخدم الدقيق للبوت مع تمرير معلومات الدفع
    const planType = planId.replace('_plan', ''); // تحويل "weekly_plan" إلى "weekly"
    const telegramBotUrl = `https://t.me/binarjoinanalytic_bot?start=pay_${planType}_${starsAmount}`;
    
    // تخزين بيانات الخطة في المتصفح للاستخدام اللاحق
    localStorage.setItem('selectedPlan', planId);
    localStorage.setItem('starsAmount', String(starsAmount));
    
    // إرسال إشعار للمستخدم مع تعليمات إضافية وواضحة
    toast({
      title: t('redirectingToTelegram'),
      description: t('useCommandInBot', { command: `/pay ${planType} ${starsAmount}` }),
      variant: 'default',
      duration: 8000,
    });
    
    // إضافة إشعار إضافي بتعليمات الدفع المفصلة
    setTimeout(() => {
      toast({
        title: 'كيفية الدفع بنجوم تلجرام',
        description: `1. انتظر فتح البوت وظهور رسالة البدء
2. استخدم الأمر: /pay ${planType} ${starsAmount} 
3. اتبع تعليمات البوت لإكمال عملية الدفع`,
        duration: 15000,
        variant: 'default',
      });
    }, 1000);
    
    // بدلاً من التوجيه المباشر إلى تلجرام، سنوجه المستخدم أولاً إلى صفحة توجيه الدفع
    window.location.href = `/telegram-payment-guide?plan=${planType}&stars=${starsAmount}`;
    
    // بدلاً من محاولة الترقية الآن، نعرض على المستخدم رسالة توضيحية
    toast({
      title: t('paymentPending'),
      description: t('completePaymentInTelegram'),
      variant: 'default',
      duration: 10000, // إظهار الرسالة لمدة أطول
    });
    
    // إعادة تعيين حالة المعالجة
    setIsProcessing(false);
  };
  
  // الحصول على المخطط الحالي للمستخدم
  const getCurrentPlan = () => {
    if (!user || !user.subscriptionLevel) {
      return 'free';
    }
    return user.subscriptionLevel;
  };

  // تعيين الإصدارات الافتراضية للروبوت
  useEffect(() => {
    const defaultVersions: {[key: string]: string} = {};
    plans.forEach(plan => {
      if (plan.botVersions && plan.botVersions.length > 0) {
        defaultVersions[plan.id] = '_default';
      }
    });
    setSelectedBotVersions(defaultVersions);
  }, []);
  
  const currentPlan = getCurrentPlan();
  
  // دعم للواجهات الأخرى
  const socialLinks = [
    { name: 'Telegram', icon: 'telegram', url: 'https://t.me/binarjoinanalytic_bot', image: '/telegram.svg' },
    { name: 'WhatsApp', icon: 'whatsapp', url: 'https://whatsapp.com/channel/0029VauwAhTDeON0dKoq4h0i', image: '/whatsapp.svg' },
    { name: 'YouTube', icon: 'youtube', url: 'https://youtube.com/@binarjoinanalytic', image: '/youtube.svg' }
  ];
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('subscriptionPlans')}</title>
        <meta name="description" content={t('subscriptionMetaDescription')} />
      </Helmet>
      
      {/* تم إضافة الأساليب كصفوف في Tailwind */}
      
      <div className="p-4 md:p-6">
        {/* عنوان الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{t('tradingSignalSubscriptionPlans')}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('professionalTradingInsights')}</p>
        </div>
        
        {/* زر تبديل العملة العام */}
        <div className="mb-6 flex justify-center">
          <Button 
            variant="outline" 
            onClick={toggleCurrency}
            className="flex items-center gap-2"
          >
            {currency === 'USD' ? <Star className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
            {currency === 'USD' 
              ? t('switchToStars')
              : t('switchToUSD')
            }
            <RefreshCw className="h-3 w-3 mr-1" />
          </Button>
        </div>
        
        {/* شريط التنبيه */}
        {user?.subscriptionLevel && user.subscriptionLevel !== 'free' && (
          <div className="mb-8">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-full">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{t('activeSubscription')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('currentPlanMessage', { plan: user.subscriptionLevel })}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-primary to-primary-foreground/80 text-white border-0 px-3 py-1.5">
                    {t('active')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* قسم الباقات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 px-5 sm:px-6 md:px-8 mb-8">
          {plans.map((plan) => {
            const isPlanActive = currentPlan === plan.id;
            const isDisabled = isPlanActive || isProcessing;
            
            return (
              <Card 
                key={plan.id} 
                className={`plan-card ${plan.id}-plan overflow-hidden transition-all ${
                  isPlanActive 
                    ? 'shadow-md selected' 
                    : plan.isPopular 
                      ? 'shadow-lg' 
                      : 'hover:shadow-sm'
                } ${plan.isPopular ? 'lg:-mt-2 lg:mb-2' : ''}`}
              >
                {plan.isNew && (
                  <div className="new-badge">
                    NEW!
                  </div>
                )}
                
                {plan.isPopular && (
                  <div className="recommended-badge">
                    {t('recommended')}
                  </div>
                )}
                
                {plan.id === 'weekly' && (
                  <div className="beginner-badge">
                    {t('beginner')}
                  </div>
                )}
                
                <CardHeader className="pb-2 pt-3 px-3 text-center plan-header">
                  <div className="plan-title text-xl font-bold mb-1">
                    {plan.label}
                  </div>
                  
                  <div className={`price ${currency === 'USD' ? 'price-usd' : ''} text-3xl font-bold`}>
                    {currency === 'USD' 
                      ? planPrices[plan.id as keyof typeof planPrices].USD 
                      : planPrices[plan.id as keyof typeof planPrices].STARS
                    }
                  </div>
                  
                  <button
                    onClick={toggleCurrency}
                    className="currency-toggle-btn w-92 mx-auto bg-gray-200 hover:bg-gray-300 text-center py-2 rounded-3xl my-2 text-sm font-normal flex items-center justify-center px-4"
                    dir="rtl"
                  >
                    {currency === 'USD' 
                      ? <><RefreshCw className="h-3 w-3 ml-1 icon-rotate" /> <span>{t('switchToStarsWithCount', { count: planPrices[plan.id as keyof typeof planPrices].STARS })}</span></>
                      : <><RefreshCw className="h-3 w-3 ml-1 icon-rotate" /> <span>{t('switchToUSD')}</span></>
                    }
                  </button>
                  
                  <div className="plan-description mt-2 mb-4 text-sm text-center">{plan.description}</div>
                  
                  <div className="relative w-full">
                    <select 
                      value={selectedBotVersions[plan.id] || '_default'}
                      onChange={(e) => handleBotVersionChange(plan.id, e.target.value)}
                      className="w-full text-right appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 h-11 pr-4 pl-8 outline-none"
                      dir="rtl"
                    >
                      <option value="_default">{t('selectBotVersion')}</option>
                      {plan.botVersions.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-3 w-3 text-gray-500" />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 pb-0 px-3">
                  <h3 className="feature-heading text-center font-semibold mb-2">
                    {plan.id === 'weekly' && t('planHighlights')}
                    {plan.id === 'monthly' && t('advancedFeatures')}
                    {plan.id === 'annual' && t('exclusiveProfessionalFeatures')}
                    {plan.id === 'premium' && t('premiumDataFeatures')}
                  </h3>
                  
                  {plan.id === 'premium' && (
                    <div className="version-info-box">
                      <div className="new-badge-inline">
                        <span className="new-badge-text">جديد!</span>
                      </div>
                      <h4 className="premium-title">🔴 {t('newBinarJoinVersion')} <span className="fire-icon">🔥</span></h4>
                      <p className="premium-description">🚀 {t('preciseSignalsDescription')}</p>
                      
                      <h4 className="mt-3 premium-subtitle">{t('whyBinarJoinV41')}</h4>
                      <ul className="features-highlight premium-features">
                        <li><span className="check-icon">✅</span> {t('modernUserFriendlyDesign')} 📱💻</li>
                        <li><span className="check-icon">✅</span> {t('accurateTradingSignals')} 📊</li>
                        <li><span className="check-icon">✅</span> {t('multiPlatform')} 🔄</li>
                        <li><span className="check-icon">✅</span> {t('automaticallyUpdatedSignals')}</li>
                      </ul>
                      <p className="premium-cta font-medium">📌 {t('tryItNow')}</p>
                      
                      <div className="premium-footer">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        <span>{t('forProfessionalTradersPrecision')}</span>
                      </div>
                    </div>
                  )}
                  
                  <ul className="features-list space-y-2 mb-4">
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
                    onClick={() => !isDisabled && handleUpgrade(plan.id)}
                    disabled={isDisabled}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('processing')}
                      </>
                    ) : isPlanActive ? (
                      t('currentPlan')
                    ) : (
                      plan.callToAction
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        

        
        {/* ميزات إضافية */}
        <div className="mb-10">
          <Card>
            <CardHeader>
              <CardTitle>{t('allPlansInclude')}</CardTitle>
              <CardDescription>{t('basicFeatureDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t('quickSetup')}</h3>
                    <p className="text-sm text-muted-foreground">{t('quickSetupDescription')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Gem className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t('premiumIndicators')}</h3>
                    <p className="text-sm text-muted-foreground">{t('premiumIndicatorsDescription')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t('secureAccess')}</h3>
                    <p className="text-sm text-muted-foreground">{t('secureAccessDescription')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* روابط التواصل */}
        <div className="social-links flex justify-center gap-6 mb-8 mt-4">
          {socialLinks.map(link => (
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-link flex items-center bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-all"
              key={link.name}
            >
              <img 
                src={link.image} 
                alt={link.name} 
                className="w-4 h-4 mr-1.5" 
                style={{ maxWidth: '16px', maxHeight: '16px' }}
              />
              <span className="font-medium text-sm">{link.name}</span>
            </a>
          ))}
        </div>
        
        {/* الأسئلة الشائعة */}
        <div>
          <h2 className="text-2xl font-bold mb-4">{t('frequentlyAskedQuestions')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('cancellationQuestion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('cancellationAnswer')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('refundQuestion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('refundAnswer')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('paymentMethodsQuestion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('paymentMethodsAnswer')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('changeSubscriptionQuestion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('changeSubscriptionAnswer')}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* نافذة طرق الدفع المنبثقة */}
        {isPaymentModalOpen && (
          <div className="payment-modal-overlay" onClick={closePaymentModal}>
            <div 
              ref={modalRef}
              className={`payment-modal ${isModalClosing ? 'closing' : ''}`} 
              onClick={(e) => e.stopPropagation()}
            >
              <button className="payment-modal-close" onClick={closePaymentModal}>
                <X size={20} />
              </button>
              
              <h2 className="payment-modal-title">{t('choosePaymentMethod')}</h2>
              
              <div className="payment-tabs">
                <div 
                  className={`payment-tab ${paymentTab === 'platforms' ? 'active' : ''}`}
                  onClick={() => changePaymentTab('platforms')}
                >
                  {t('platforms')}
                </div>
                <div 
                  className={`payment-tab ${paymentTab === 'wallets' ? 'active' : ''}`}
                  onClick={() => changePaymentTab('wallets')}
                >
                  {t('wallets')}
                </div>
                <div 
                  className={`payment-tab ${paymentTab === 'traditional' ? 'active' : ''}`}
                  onClick={() => changePaymentTab('traditional')}
                >
                  {t('traditional')}
                </div>
              </div>
              
              {/* خيارات المنصات */}
              <div className={`payment-content ${paymentTab === 'platforms' ? 'active' : ''}`}>
                <div className="payment-options">
                  <div className="payment-option" onClick={() => selectPaymentMethod('binance')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 126.61 126.61" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="#F3BA2F">
                        <path d="m38.73 53.2 24.59-24.58 24.6 24.6 14.3-14.31-38.9-38.91-38.9 38.9z"/>
                        <path d="m0 63.31 14.3-14.31 14.31 14.31-14.31 14.3z"/>
                        <path d="m38.73 73.41 24.59 24.59 24.6-24.59 14.31 14.3-38.91 38.9-38.9-38.9z"/>
                        <path d="m98 63.31 14.3-14.31 14.31 14.31-14.31 14.3z"/>
                        <path d="m63.31 63.31 24.6-24.59 7.83 7.82-16.78 16.77 16.78 16.78-7.83 7.83-24.6-24.61"/>
                      </svg>
                    </div>
                    <div>{t('binance')}</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('okx')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="black"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M8.37292 9.82427L10.5281 12.0001L8.37292 14.1759L6.21777 12.0001L8.37292 9.82427ZM12.0001 5.49963L14.1553 7.6755L12.0001 9.85043L9.8449 7.6755L12.0001 5.49963ZM15.6284 9.82578L17.7836 12.0016L15.6284 14.1774L13.4732 12.0016L15.6284 9.82578ZM12.0001 14.1503L14.1553 16.3253L12.0001 18.5002L9.8449 16.3253L12.0001 14.1503Z" fill="white"/>
                      </svg>
                    </div>
                    <div>{t('okx')}</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('bybit')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <circle cx="16.5" cy="16.5" r="16.5" fill="#333333"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M21.9791 9.00037L20.2588 10.7207V10.7213L21.9799 12.4423L23.7008 10.7213L21.9791 9.00037ZM13.7395 9.00037L13.7397 9.00046L13.7397 9.00044L13.7395 9.00037ZM9.00002 13.7397L10.7209 15.4607L12.4419 13.7397L10.7203 12.0182L9.00002 13.7397ZM12.4384 24.0001L14.1593 22.2792L12.4384 20.5583L10.7174 22.2792L12.4384 24.0001ZM22.0168 24.0001L23.7378 22.2792L22.0168 20.5583L20.2959 22.2792L22.0168 24.0001ZM16.5005 19.9177L13.7395 17.1568L16.5005 14.3958L19.2614 17.1568L16.5005 19.9177Z" fill="white"/>
                      </svg>
                    </div>
                    <div>{t('bybit')}</div>
                  </div>
                </div>
              </div>
              
              {/* خيارات المحافظ */}
              <div className={`payment-content ${paymentTab === 'wallets' ? 'active' : ''}`}>
                <div className="payment-options">
                  <div className="payment-option" onClick={() => selectPaymentMethod('trustwallet')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" className="w-full h-full">
                        <path d="M239.6 86.7c12-11.9 31.4-11.9 43.4 0 12 11.9 12 31.2 0 43.2-12 11.9-31.4 11.9-43.4 0-12-11.9-12-31.2 0-43.2z" fill="#0500ff"/>
                        <linearGradient id="a" gradientUnits="userSpaceOnUse" x1="150" y1="300" x2="150" y2="0">
                          <stop offset="0" stopColor="#75d6ff"/>
                          <stop offset=".16" stopColor="#74d3fc"/>
                          <stop offset=".31" stopColor="#70c8f2"/>
                          <stop offset=".47" stopColor="#69b5e1"/>
                          <stop offset=".63" stopColor="#5f9bca"/>
                          <stop offset=".79" stopColor="#527aac"/>
                          <stop offset=".95" stopColor="#435189"/>
                          <stop offset="1" stopColor="#3c437f"/>
                        </linearGradient>
                        <path d="M261.3 108.3c0 61.5-49.8 111.3-111.3 111.3S38.7 169.8 38.7 108.3 88.5-3 150-3s111.3 49.8 111.3 111.3z" fill="url(#a)"/>
                        <path d="M201.1 89.1c16-17.3 16-44.3 0-61.7-16-17.3-41.9-17.3-57.9 0L82.4 91.7c-4.2 4.5-7.2 9.8-9 15.5h135.4l-7.7-18.1z" fill="#fff"/>
                        <path d="M73.5 137.5c4.2 28.2 27.4 50.1 56.3 52.6 28.9 2.5 55.3-15.7 64.2-43.5l.6-1.8H71.2l2.3 4.2c0-3.8 0-7.7.5-11.5h-8.4c.3 5.1.9 9.9 1.8 14.5l6.1-14.5z" fill="#fff"/>
                      </svg>
                    </div>
                    <div>{t('trustWallet')}</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('metamask')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <path d="M33.5621 4.05664L21.6553 14.2202L23.9177 8.11597L33.5621 4.05664Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.43066 4.05664L18.2443 14.2957L16.0822 8.11597L6.43066 4.05664Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M29.1183 27.8987L25.7207 33.6722L33.0574 35.9345L35.1512 27.9967L29.1183 27.8987Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4.85938 27.9967L6.9422 35.9345L14.2709 33.6722L10.8813 27.8987L4.85938 27.9967Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.8082 18.3428L11.8633 21.8303L19.1152 22.205L18.8322 14.3716L13.8082 18.3428Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M26.1915 18.3428L21.07 14.2957L20.8809 22.205L28.1328 21.8303L26.1915 18.3428Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.2715 33.6722L18.6395 31.3619L14.9076 28.0454L14.2715 33.6722Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.3574 31.3619L25.7215 33.6722L25.0893 28.0454L21.3574 31.3619Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M25.7215 33.6727L21.3574 31.3623L21.7493 34.4676L21.7102 35.8589L25.7215 33.6727Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.2715 33.6727L18.2908 35.8589L18.2596 34.4676L18.6395 31.3623L14.2715 33.6727Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.3623 25.9103L14.7695 24.738L17.2133 23.4697L18.3623 25.9103Z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.6348 25.9103L22.7837 23.4697L25.2354 24.738L21.6348 25.9103Z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.2711 33.6722L14.9346 27.8987L10.8809 27.9967L14.2711 33.6722Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M25.0703 27.8987L25.7219 33.6722L29.1201 27.9967L25.0703 27.8987Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M28.1321 21.8303L20.8802 22.205L21.6347 25.9105L22.7836 23.4699L25.2353 24.7382L28.1321 21.8303Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.77 24.7382L17.2139 23.4699L18.3627 25.9105L19.1173 22.205L11.8633 21.8303L14.77 24.7382Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M11.8633 21.8303L14.9073 28.0454L14.7691 24.7382L11.8633 21.8303Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M25.2338 24.7382L25.0879 28.0454L28.1319 21.8303L25.2338 24.7382Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19.1172 22.205L18.3625 25.9105L19.3102 30.8689L19.5307 24.3847L19.1172 22.205Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.8798 22.205L20.4744 24.3729L20.6871 30.8689L21.6348 25.9105L20.8798 22.205Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.6349 25.9107L20.6873 30.8691L21.3571 31.3617L25.0889 28.0453L25.2348 24.7383L21.6349 25.9107Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.7695 24.7383L14.9078 28.0453L18.6397 31.3617L19.3096 30.8691L18.3619 25.9107L14.7695 24.7383Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.7109 35.8586L21.75 34.4673L21.3891 34.1654H18.6084L18.2592 34.4673L18.2904 35.8586L14.2711 33.6724L15.9293 35.0165L18.5658 36.8027H21.4279L24.0684 35.0165L25.7227 33.6724L21.7109 35.8586Z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.3576 31.362L20.6877 30.8695H19.3098L18.64 31.362L18.26 34.4673L18.6092 34.1654H21.3899L21.7508 34.4673L21.3576 31.362Z" fill="#161616" stroke="#161616" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M34.1055 14.7566L35.1953 8.95781L33.5605 4.05664L21.3574 13.7705L26.1908 18.343L32.9824 20.5644L34.4327 18.8844L33.8044 18.4335L34.8395 17.5318L34.0768 16.9429L35.1118 16.1971L34.1055 14.7566Z" fill="#763E1A" stroke="#763E1A" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4.80469 8.95781L5.90639 14.7566L4.87997 16.1971L5.91508 16.9429L5.15858 17.5318L6.19368 18.4335L5.56536 18.8844L7.00955 20.5644L13.8012 18.343L18.6345 13.7705L6.43165 4.05664L4.80469 8.95781Z" fill="#763E1A" stroke="#763E1A" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M32.9826 20.5644L26.191 18.3429L28.1323 21.8305L25.0883 28.0456L29.12 27.9966H35.1528L32.9826 20.5644Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.8017 18.3429L7.01 20.5644L4.85938 27.9966H10.8812L14.9072 28.0456L11.8632 21.8305L13.8017 18.3429Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.8797 22.205L21.3569 13.77L23.9188 8.11597H16.082L18.6361 13.77L19.1173 22.205L19.3027 24.3965L19.3105 30.8689H20.6885L20.6963 24.3965L20.8797 22.205Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>{t('metamask')}</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('okx-wallet')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="black"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M8.37292 9.82427L10.5281 12.0001L8.37292 14.1759L6.21777 12.0001L8.37292 9.82427ZM12.0001 5.49963L14.1553 7.6755L12.0001 9.85043L9.8449 7.6755L12.0001 5.49963ZM15.6284 9.82578L17.7836 12.0016L15.6284 14.1774L13.4732 12.0016L15.6284 9.82578ZM12.0001 14.1503L14.1553 16.3253L12.0001 18.5002L9.8449 16.3253L12.0001 14.1503Z" fill="white"/>
                      </svg>
                    </div>
                    <div>{t('okxWallet')}</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('binance-wallet')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 126.61 126.61" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="#F3BA2F">
                        <path d="m38.73 53.2 24.59-24.58 24.6 24.6 14.3-14.31-38.9-38.91-38.9 38.9z"/>
                        <path d="m0 63.31 14.3-14.31 14.31 14.31-14.31 14.3z"/>
                        <path d="m38.73 73.41 24.59 24.59 24.6-24.59 14.31 14.3-38.91 38.9-38.9-38.9z"/>
                        <path d="m98 63.31 14.3-14.31 14.31 14.31-14.31 14.3z"/>
                        <path d="m63.31 63.31 24.6-24.59 7.83 7.82-16.78 16.77 16.78 16.78-7.83 7.83-24.6-24.61"/>
                      </svg>
                    </div>
                    <div>{t('binanceWallet')}</div>
                  </div>
                </div>
              </div>
              
              {/* خيارات الدفع التقليدية */}
              <div className={`payment-content ${paymentTab === 'traditional' ? 'active' : ''}`}>
                <div className="payment-options">
                  <div className="payment-option disabled" onClick={() => selectPaymentMethod('mastercard')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 256 199" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className="w-full h-full">
                        <path d="M46.5392504 198.011312H22.2660441V180.322123H46.5392504V198.011312Z" fill="#FF5F00"/>
                        <path d="M45.9942853 188.673235C45.9942853 193.398689 42.2605637 197.132312 37.5350482 197.132312 32.8095326 197.132312 29.0750964 193.398689 29.0750964 188.673235 29.0750964 183.94778 32.8095326 180.22 37.5350482 180.22 42.2605637 180.22 45.9942853 183.94778 45.9942853 188.673235Z" fill="#EB001B"/>
                        <path d="M92.4807874 188.673235C92.4807874 193.398689 88.7470658 197.132312 84.0215502 197.132312 79.2952502 197.132312 75.5623129 193.398689 75.5623129 188.673235 75.5623129 183.94778 79.2952502 180.22 84.0215502 180.22 88.7470658 180.22 92.4807874 183.94778 92.4807874 188.673235Z" fill="#F79E1B"/>
                        <path d="M121.14579 24H23.2339401v142.099524h97.911849V24Z" fill="#FF5F00"/>
                        <path d="M37.5342651 95.0493407C37.5235988 74.923461 47.7136732 56.2272227 64.7325027 45.2309491 46.0832908 29.8654399 20.2731693 28.3451549 0 42.4627093v97.3056247c20.2731693 14.1167702 46.0832908 12.5972697 64.7325027-2.7682094-17.0188295-10.9954892-27.2089039-29.6917274-27.1982376-42.1507839z" fill="#EB001B"/>
                        <path d="M228.686149 95.0493407c.01034-20.1258797-10.176219-38.822118-27.195082-49.8183916 18.649212-15.3655092 44.459333-16.885794 64.731217-2.7682094v97.3056247c-20.271884 14.1175546-46.082005 12.5972697-64.731217-2.7682095 17.018863-10.9962736 27.205422-29.6925119 27.195082-42.0508142z" fill="#F79E1B"/>
                        <path d="M232.65491 166.449974v-13.641485h3.995576l.909346 3.957394 3.086231-3.957394 4.895693.000787v13.640698h-4.994307v-7.921249l-3.887749 4.686729h-.098614l-3.086232-4.686729v7.921249h-3.819944zm-13.646912-9.657981c.786901-.703387 1.890112-1.054456 3.285759-1.054456 1.395647 0 2.49886.351069 3.28576.1054456.786901.703387 1.183127 1.638655 1.183127 2.816667 0 1.178012-.396226 2.11328-1.183127 2.816667-.786901.703387-1.890113 1.054456-3.28576 1.054456-1.395647 0-2.498858-.351069-3.285759-1.054456-.786901-.703387-1.183127-1.638655-1.183127-2.816667 0-1.177225.396226-2.11328 1.183127-2.816667zm4.796293 2.718053c0 .562435-.14792 1.015674-.444548 1.347102-.296628.333-1.296246.371782-1.592875.038781-.296628-.333-.444547-.784667-.444547-1.347103 0-.562436.147919-1.016461.444547-1.347102.296629-.333.494855-.372569.790697-.37257.296628.000788.494854.04035.802178.37257.296629.331428.444548.784667.444548 1.347103zm32.605324-2.718053c.786901-.703387 1.88085-1.054456 3.277283-1.054456 1.396433 0 2.499646.351069 3.286547 1.054456.786901.703387 1.183126 1.638655 1.183126 2.816667 0 1.178012-.396225 2.11328-1.183126 2.816667-.786901.703387-1.890114 1.054456-3.286547 1.054456-1.396433 0-2.490382-.351069-3.277283-1.054456-.786901-.703387-1.183127-1.638655-1.183127-2.816667 0-1.177225.396226-2.11328 1.183127-2.816667zm4.796293 2.718053c0 .562435-.148709 1.015674-.445337 1.347102-.296629.333-.49407.371782-1.592088.038781-.296628-.333-.444547-.784667-.444547-1.347103 0-.562436.147919-1.016461.444547-1.347102.296629-.333.49407-.372569.789909-.37257.296628.000788.494854.04035.80218.37257.296628.331428.444336.784667.444336 1.347103zm-55.965434 4.939928v-6.704019h-3.185572v-3.037343l3.185572-.001574v-2.718054h4.895693v2.718054h3.185571v3.038917h-3.185571v6.704019h-4.895693zm17.452175 0v-9.741393h4.798658v1.545454c.691504-1.132885 1.8795-1.692623 3.579288-1.692623.593115 0 1.183126.089199 1.775348.266811v4.313589c-.494854-.177612-1.085652-.266811-1.77613-.266811-1.6935 0-2.795 .616403-2.795 1.861699v3.713274h-4.582164zm29.122309 0v-1.54624c-.691503 1.132885-1.8795 1.694198-3.578499 1.694198-.593116 0-1.183914-.089199-1.775349-.266811v-4.313589c.494067.177611 1.086439.266811 1.776917.266811 1.692713 0 2.793431-.616403 2.793431-1.861699v-3.713273h4.5805v9.740605h-4.797l.000787-.000002z" fill="#F79E1B"/>
                      </svg>
                    </div>
                    <div>Mastercard</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('paypal')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 33" className="w-full h-full">
                        <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.97-1.142-2.694-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zm19.654-.079h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zm22.007-6.374h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z" fill="#253B80"/>
                        <path d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zm19.653-.079h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zm8.426-12.219-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="#179BD7"/>
                        <path d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z" fill="#253B80"/>
                        <path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z" fill="#179BD7"/>
                        <path d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z" fill="#222D65"/>
                        <path d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z" fill="#253B80"/>
                      </svg>
                    </div>
                    <div>PayPal</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('westernunion')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 2500 2100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <path d="M1250 2099.5c-172.3 0-339.5-33.7-496.9-100.2-152.2-64.3-288.9-156.3-406.3-273.7S137.5 1471.3 73.1 1319.1c-66.5-157.4-100.2-324.6-100.2-496.9s33.7-339.5 100.2-496.9C137.5 173.1 229.4 36.3 346.9-81.1S600.9-353.8 753.1-418.1c157.4-66.5 324.6-100.2 496.9-100.2s339.5 33.7 496.9 100.2c152.2 64.3 288.9 156.3 406.3 273.7s209.4 254.1 273.7 406.3c66.5 157.4 100.2 324.6 100.2 496.9s-33.7 339.5-100.2 496.9c-64.3 152.2-156.3 288.9-273.7 406.3s-254.1 209.4-406.3 273.7c-157.4 66.5-324.6 100.2-496.9 100.2z" fill="#ffcb05"/>
                        <path d="M2089.3 822.2c0-457.2-375.5-822.2-839.3-822.2S410.7 365 410.7 822.2c0 388.6 273.7 713.3 643.1 794.2v-283.8c-200.4-69.8-343.7-259.3-343.7-485.4 0-282.8 241.5-511.7 539.9-511.7s539.9 228.9 539.9 511.7c0 226.2-143.2 415.7-343.7 485.4v283.8c369.4-80.9 643.1-405.6 643.1-794.2z" fill="#000"/>
                        <path d="m1156.4 1077.1-113.6 379.7H930.5l-35.8-117.7-108.5 2.1-32.7 115.7H633.1l127.3-379.7H892l31.6 113.6 33.7-113.6h199.1zm-245.7 176.5c-12.6 45.2-24.2 79.9-24.2 79.9h69.8s-21-33.7-45.6-79.9zM1294.2 1296.1h-75.8v160.7h-134.6v-379.7h274.7c80.9 0 132.5 36.9 132.5 107.8 0 56.1-26.3 102.4-74.7 111.5-9.5 2.1-20 2.1-33.7 2.1h-101.3c14.7 57.2 59.3 89.9 59.3 89.9l-146.2 39.9s29.5-41 28.4-107.8c-1.1-18.9 7.3-24.4 71.4-24.4z"/><g fill="#000"><path d="M1368.8 1219.3c20-6.3 30.5-15.8 30.5-29.5 0-11.6-13.7-22.1-32.6-22.1h-72.5v52.7h72.5c.1 0 .4-.1 2.1-1.1z"/><path d="M1813.6 1077.1c-32.6 0-72.5 2.1-100.9 3.2v376.5h120.9v-119.8h59.3c33.7 0 60-4.2 81-12.6 77.8-32.7 104.1-108.5 104.1-148.5 0-49.5-30.5-98.9-134.6-98.9h-129.8zm29.5 171.3v-94.1h66.7c36.9 0 54.8 17.9 54.8 43.1 0 26.3-16.8 51-54.8 51h-66.7zM1670.1 1077.1h-123v127.8h123c38.9 0 55.8 13.7 55.8 35.8 0 22.1-19 36.9-55.8 36.9h-123v56.1c36.9 0 123 1.1 123 1.1 43.1 0 123-9.5 123-93.1 0-78.9-83.1-164.6-123-164.6z"/></g>
                      </svg>
                    </div>
                    <div>Western Union</div>
                  </div>
                  
                  <div className="payment-option" onClick={() => selectPaymentMethod('moneygram')}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2">
                      <svg viewBox="0 0 220 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <path d="M170.6 36.1c-2.5 0-4.6-2-4.6-4.6 0-2.5 2-4.6 4.6-4.6 2.5 0 4.6 2 4.6 4.6 0 2.5-2.1 4.6-4.6 4.6zm0-11c-3.5 0-6.4 2.9-6.4 6.4 0 3.5 2.9 6.4 6.4 6.4 3.5 0 6.4-2.9 6.4-6.4 0-3.5-2.9-6.4-6.4-6.4z" fill="#DB0011"/>
                        <path d="M203 36.1c-2.5 0-4.6-2-4.6-4.6 0-2.5 2-4.6 4.6-4.6 2.5 0 4.6 2 4.6 4.6 0 2.5-2.1 4.6-4.6 4.6zm0-11c-3.5 0-6.4 2.9-6.4 6.4 0 3.5 2.9 6.4 6.4 6.4 3.5 0 6.4-2.9 6.4-6.4 0-3.5-2.9-6.4-6.4-6.4z" fill="#DB0011"/>
                        <path d="M28.5 36.2c0 .6-.4 1-1 1h-4.2v-12h4.2c.6 0 1 .4 1 1v10z" fill="#DB0011"/>
                        <path d="M27.7 23.5H11c-.6 0-1 .4-1 1v11c0 .6.4 1 1 1h4.2v-11h12.4c1.6 0 2.9 1.3 2.9 2.9v8.1h4.2v-10c.1-1.6-1.3-3-3-3z" fill="#DB0011"/>
                        <path d="M45 23.5H31.3c-.6 0-1 .4-1 1v11c0 .6.4 1 1 1h13.8c1.6 0 2.9-1.3 2.9-2.9V26.4c0-1.6-1.3-2.9-3-2.9zm-1.1 10H35.3v-7.1h8.6v7.1z" fill="#DB0011"/>
                        <path d="M58.4 23.5H47.2c-.6 0-1 .4-1 1v11c0 .6.4 1 1 1h4.2v-5.1h7c.6 0 1-.4 1-1v-4c0-1.6-1.3-2.9-3-2.9zm-1.1 6h-5.9v-3.1h5.9v3.1z" fill="#DB0011"/>
                        <path d="M64.5 25.4h5.9v11c0 .6.4 1 1 1h4.2v-12c0-.6-.4-1-1-1H65.5c-.6 0-1 .4-1 1v.1c0 0 0-.1 0 0z" fill="#DB0011"/>
                        <path d="M81.6 23.5h-4.2v12c0 .6.4 1 1 1h3.1c.6 0 1-.4 1-1v-11c.1-.6-.3-1-.9-1z" fill="#DB0011"/>
                        <path d="M92.6 23.5h-5.3c-1.6 0-2.9 1.3-2.9 2.9v.8c0 .4.1.7.3 1 .3.5.9 1.5.9 1.5-2.3.2-2 3.1-2 3.1v2.7c0 .6.4 1 1 1h4.2v-4.1h3.9v-3h-4.1c-.4 0-.7-.3-.7-.7V26.4h4.8c.6 0 1-.4 1-1v-.1c0-.4-.4-.8-1.1-.8z" fill="#DB0011"/>
                        <path d="M106.5 23.5H93.7c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h4.2v-2h8.6v2.1h-10.6c-.6 0-1 .4-1 1v2.9c0 .6.4 1 1 1h2.1v2.1h4.2v-2.1h4.4c.6 0 1-.4 1-1v-8c0-.6-.5-1-1.1-1z" fill="#DB0011"/>
                        <path d="M188.1 23.5h-13.9c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h4.2v-1.9h9.7c.6 0 1 .4 1 1v2.4c0 .6-.4 1-1 1h-13.9v3h13.9c1.6 0 2.9-1.3 2.9-2.9v-4.5c0-1.6-1.3-3.1-2.9-3.1z" fill="#DB0011"/>
                        <path d="M132.6 23.5H119c-.6 0-1 .4-1 1v11c0 .6.4 1 1 1h4.2v-11h9.4c.6 0 1 .4 1 1v10h4.2v-10c-.1-1.6-1.5-3-5.2-3z" fill="#DB0011"/>
                        <path d="M154.7 23.5H144c-1.6 0-2.9 1.3-2.9 2.9v.4c0 .6.4 1 1 1h4.2V26h5.2c0 1.8-2.2 3.1-2.2 3.1s-.5-.1-.9-.1h-5.4c-.6 0-1 .4-1 1v1c0 .6.4 1 1 1h2.9c.6 0 1 .4 1 1v2.1h4.2v-2.1c0-.6.4-1 1-1h1.7c.6 0 1-.4 1-1v-1c0-.6-.4-1-1-1h-1c3.2-2.4 3.2-4.5 3.2-4.6.1-.4-.6-.9-1.3-.9z" fill="#DB0011"/>
                      </svg>
                    </div>
                    <div>MoneyGram</div>
                  </div>
                </div>
              </div>
              
              <div className="switch-currency mt-6">
                <span>{t('switchToStars')}</span>
                <RefreshCcw size={14} />
                <span className="switch-stars" onClick={toggleCurrency}>{t('stars')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}