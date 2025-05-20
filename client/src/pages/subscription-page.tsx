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
  RefreshCw, DollarSign, LifeBuoy, Book, Smartphone, Award
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
      color: 'from-green-500 to-teal-600',
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
      color: 'from-blue-500 to-indigo-600',
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
      color: 'from-purple-500 to-pink-600',
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
      description: t('advancedDataDrivenAnalysis'),
      color: 'from-amber-500 to-yellow-600',
      icon: <Medal className="h-5 w-5" />,
      botVersions: ['BinarJoinAnalytic V.4.1'],
      features: [
        { text: t('advancedMarketDataAnalysis'), available: true },
        { text: t('robotPoweredTradingSignals'), available: true },
        { text: t('ultraFastMarketInsights'), available: true },
        { text: t('exclusivePremiumStrategies'), available: true },
        { text: t('dedicatedAccountManager'), available: true },
        { text: t('prioritySignalDelivery'), available: true },
      ],
      idealFor: t('forProfessionalTradersPrecision'),
      isPopular: false,
      callToAction: t('getPremiumDataAccess'),
      disabled: false,
      isNew: true
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {plans.map((plan) => {
            const isPlanActive = currentPlan === plan.id;
            const isDisabled = isPlanActive || isProcessing;
            
            return (
              <Card 
                key={plan.id} 
                className={`plan-card overflow-hidden border-2 transition-all ${
                  isPlanActive 
                    ? 'border-primary shadow-md' 
                    : plan.isPopular 
                      ? 'border-primary/50 shadow-lg' 
                      : 'border-border hover:border-border/80 hover:shadow-sm'
                } ${plan.isPopular ? 'lg:-mt-2 lg:mb-2' : ''}`}
              >
                {plan.isNew && (
                  <div className="new-badge">
                    NEW!
                  </div>
                )}
                
                {plan.isPopular && (
                  <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-medium">
                    {t('recommended')}
                  </div>
                )}
                
                <CardHeader className={`${(plan.isPopular || plan.isNew) ? 'pt-4' : 'pt-6'} pb-2 text-center plan-header`}>
                  <Badge className="mb-2" variant="outline">{plan.name}</Badge>
                  <CardTitle className="text-xl mb-1">{plan.label}</CardTitle>
                  <div className={`price ${currency === 'USD' ? 'price-usd' : ''}`}>
                    {plan.price}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="plan-currency-toggle w-full text-xs"
                    onClick={toggleCurrency}
                  >
                    {currency === 'USD' 
                      ? <><RefreshCw className="h-3 w-3 mr-1" />{t('switchToStars', {count: currency === 'USD' ? planPrices[plan.id as keyof typeof planPrices].STARS : planPrices[plan.id as keyof typeof planPrices].USD})}</>
                      : <><RefreshCw className="h-3 w-3 mr-1" />{t('switchToUSD')}</>
                    }
                  </Button>
                  
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                  
                  <div className="bot-version-container">
                    <Select
                      value={selectedBotVersions[plan.id] || ''}
                      onValueChange={(value) => handleBotVersionChange(plan.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectBotVersion')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_default">{t('selectBotVersion')}</SelectItem>
                        {plan.botVersions.map((version) => (
                          <SelectItem key={version} value={version}>
                            {version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 pb-0">
                  <h3 className="font-medium text-center mb-3">
                    {plan.id === 'weekly' && t('planHighlights')}
                    {plan.id === 'monthly' && t('advancedFeatures')}
                    {plan.id === 'annual' && t('exclusiveProfessionalFeatures')}
                    {plan.id === 'premium' && t('premiumDataFeatures')}
                  </h3>
                  
                  <ul className="features-list space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-1 feature-icon" />
                        <span className="feature-text">
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-2 pb-6 flex flex-col">
                  <div className="ideal-for text-muted-foreground mb-3">
                    <LifeBuoy className="h-4 w-4 mr-2 text-muted-foreground" />
                    {plan.idealFor}
                  </div>
                  
                  <Button 
                    variant={isPlanActive ? "secondary" : plan.isPopular ? "default" : "outline"}
                    className={`w-full ${plan.isPopular ? 'bg-gradient-to-r from-primary to-primary-foreground/80 text-white hover:from-primary/90 hover:to-primary-foreground/70' : ''}`}
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
                      <>
                        {plan.id === 'premium' ? (
                          <Medal className="mr-2 h-4 w-4" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {plan.callToAction}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        {/* بانر ترويجي */}
        <div className="promotional-banner mb-10">
          <h3 className="text-xl font-bold mb-3 flex items-center">
            <span className="text-red-500 mr-2">🔴</span>
            {t('newBinarJoinVersion')}
            <span className="text-amber-500 ml-2">🔥</span>
          </h3>
          <p className="mb-4">{t('preciseSignalsDescription')}</p>
          
          <h4 className="font-bold mb-2">{t('whyBinarJoinV41')}</h4>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mr-2 mt-1" />
              <span>{t('modernUserFriendlyDesign')}</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mr-2 mt-1" />
              <span>{t('accurateTradingSignals')}</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mr-2 mt-1" />
              <span>{t('multiPlatform')}</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mr-2 mt-1" />
              <span>{t('automaticallyUpdatedSignals')}</span>
            </li>
          </ul>
          <p className="font-medium">{t('tryItNow')}</p>
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
        <div className="social-links mb-8">
          {socialLinks.map(link => (
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-link"
              key={link.name}
            >
              <img src={link.image} alt={link.name} className="w-6 h-6" />
              {link.name}
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