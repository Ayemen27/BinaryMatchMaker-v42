import { useState, useEffect } from 'react';
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
  RefreshCw, DollarSign, LifeBuoy, Book, Smartphone, Award, ChevronDown
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
    annual: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0', 'BinarJoinAnalytic Pro v3.5'],
    premium: ['BinarJoinAnalytic v1.0', 'BinarJoinAnalytic Main v2.0', 'BinarJoinAnalytic AI v3.0', 'BinarJoinAnalytic Pro v3.5', 'BinarJoinAnalytic V.4.1']
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
      icon: <Shield className="h-5 w-5" />,
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
      icon: <Star className="h-5 w-5" />,
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
      icon: <Award className="h-5 w-5" />,
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
      description: "BinarJoinAnalytic V.4.1 - ثورة إشارات التداول 🔥",
      color: 'from-amber-400 to-yellow-500',
      icon: <Medal className="h-5 w-5" />,
      botVersions: ['BinarJoinAnalytic V.4.1'],
      features: [
        { text: 'تحليل بيانات السوق المتقدمة', available: true },
        { text: 'إشارات التداول المدعومة بالروبوت', available: true },
        { text: 'رؤى السوق فائقة السرعة', available: true },
        { text: 'استراتيجيات مميزة حصرية', available: true },
        { text: 'مدیر حساب مخصص', available: true },
        { text: 'توصيل الإشارة ذات الأولوية', available: true },
      ],
      idealFor: "مخصص للاصدار V.4.1 - ثورة في إشارات التداول ودقة التوقعات!",
      isPopular: false,
      callToAction: t('getPremiumDataAccess'),
      disabled: false,
      isNew: true,
      extraDescription: 'إشارات دقيقة، قرارات أكثر ذكاءً! مع Binar Join Analytic V.4.1 الجديد، احصل على إشارات محدثة دقيقة بدقيقة لمساعدتك على اتخاذ قرارات استثمارية ناجحة.'
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
  
  // مفوض التعامل مع ترقية الاشتراك
  const handleUpgrade = (planId: string) => {
    if (isProcessing) return;
    if (!selectedBotVersions[planId] || selectedBotVersions[planId] === '_default') {
      toast({
        title: t('botVersionRequired'),
        description: t('pleasSelectBotVersion'),
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedPlan(planId);
    setIsProcessing(true);
    
    // إرسال بيانات الاشتراك
    setTimeout(() => {
      upgradeMutation.mutate({
        planType: planId,
        botVersion: selectedBotVersions[planId],
      });
    }, 1500);
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
    { name: 'Telegram', icon: 'telegram', url: 'https://t.me/Binarjoinanelytic_bot', image: '/telegram.png' },
    { name: 'WhatsApp', icon: 'whatsapp', url: 'https://wa.me/message/WFOMDMQWZUJMN1', image: '/whatsapp.png' },
    { name: 'YouTube', icon: 'youtube', url: 'https://youtube.com/@binarjoinanalytic', image: '/youtube.png' }
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
            {currency === 'USD' ? <Star className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
            {currency === 'USD' ? t('switchToStars') : t('switchToUSD')}
            <RefreshCw className="h-4 w-4 mr-1" />
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
                      <Check className="h-5 w-5" />
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
                      ? <><RefreshCw className="h-4 w-4 ml-1 icon-rotate" /> <span>{`التبديل إلى النجوم (${planPrices[plan.id as keyof typeof planPrices].STARS})`}</span></>
                      : <><RefreshCw className="h-4 w-4 ml-1 icon-rotate" /> <span>{`التبديل إلى الدولار`}</span></>
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
                      <option value="_default">اختر إصدار البوت</option>
                      {plan.botVersions.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-500" />
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
                        <span className="new-badge-text">NEW!</span>
                      </div>
                      <h4 className="premium-title">🔴 NEW! Binar Join Analytic V.4.1 – Trading Signals Revolution <span className="fire-icon">🔥</span></h4>
                      <p className="premium-description">🚀 إشارات دقيقة، قرارات أكثر ذكاءً! مع Binar Join Analytic V.4.1 الجديد، احصل على إشارات محدثة دقيقة بدقيقة لمساعدتك على اتخاذ قرارات استثمارية ناجحة.</p>
                      
                      <h4 className="mt-3 premium-subtitle">لماذا Binar Join Analytic V.4.1؟</h4>
                      <ul className="features-highlight premium-features">
                        <li><span className="check-icon">✅</span> تصميم حديث وسهل الاستخدام – تجربة سلسة وسريعة على جميع الأجهزة 📱💻</li>
                        <li><span className="check-icon">✅</span> إشارات تداول دقيقة – مبنية على تحليل في الوقت الحقيقي واتجاهات السوق 📊</li>
                        <li><span className="check-icon">✅</span> متعدد المنصات – متوافق مع منصات التداول الرئيسية، بما في ذلك EQ Broker 🔄</li>
                        <li><span className="check-icon">✅</span> إشارات تُحدّث تلقائيًا – لا حاجة للتحديثات اليدوية!</li>
                      </ul>
                      <p className="premium-cta font-medium">📌 جربه الآن وابدأ في تحقيق أقصى استفادة من مزايا إشارات التداول!</p>
                      
                      <div className="premium-footer">
                        <Star className="h-4 w-4 text-yellow-500 mr-2" />
                        <span>للمتداولين المحترفين الذين يتطلبون الدقة</span>
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
              className="social-link flex items-center bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-all"
              key={link.name}
            >
              {link.name === 'Telegram' && <img src="/telegram.svg" alt="Telegram" className="w-6 h-6 mr-2" />}
              {link.name === 'WhatsApp' && <img src="/whatsapp.svg" alt="WhatsApp" className="w-6 h-6 mr-2" />}
              {link.name === 'YouTube' && <img src="/youtube.svg" alt="YouTube" className="w-6 h-6 mr-2" />}
              <span className="font-medium">{link.name}</span>
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
      </div>
    </Layout>
  );
}