import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Helmet } from 'react-helmet';
import { Check, AlertCircle, CreditCard, Gem, Shield, Star, Zap, Medal, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // استعلام لجلب بيانات الاشتراك الحالي للمستخدم
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['/api/user/subscription'],
    enabled: !!user
  });
  
  // تنفيذ طلب ترقية الاشتراك
  const upgradeMutation = useMutation({
    mutationFn: async (planType: string) => {
      const response = await fetch('/api/user/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
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
  
  // بنية خطط الاشتراك مع مزيد من التفاصيل والميزات
  const plans = [
    {
      id: 'free',
      name: t('freePlan'),
      price: t('free'),
      period: '',
      description: t('basicFeatures'),
      color: 'from-neutral-500 to-gray-600',
      icon: <Shield className="h-5 w-5" />,
      features: [
        { text: t('limitedSignals', { count: 3 }), available: true },
        { text: t('basicMarketIndicators'), available: true },
        { text: t('standardSupport'), available: true },
        { text: t('basicAnalytics'), available: true },
        { text: t('advancedFeatures'), available: false },
      ],
      isPopular: false,
      callToAction: t('currentPlan'),
      disabled: true,
    },
    {
      id: 'basic',
      name: t('basicPlan'),
      price: '$29',
      period: t('monthly'),
      description: t('suitableForBeginners'),
      color: 'from-green-500 to-emerald-600',
      icon: <Zap className="h-5 w-5" />,
      features: [
        { text: t('limitedSignals', { count: 30 }), available: true },
        { text: t('basicMarketAnalysis'), available: true },
        { text: t('signalAccuracyPercent', { percent: 85 }), available: true },
        { text: t('prioritySupport'), available: true },
        { text: t('realtimeAlerts'), available: false },
      ],
      isPopular: false,
      callToAction: t('subscribe'),
      disabled: false,
    },
    {
      id: 'pro',
      name: t('proPlan'),
      price: '$79',
      period: t('monthly'),
      description: t('forProfessionalTraders'),
      color: 'from-blue-500 to-indigo-600',
      icon: <Star className="h-5 w-5" />,
      features: [
        { text: t('unlimitedSignals'), available: true },
        { text: t('advancedMarketAnalysis'), available: true },
        { text: t('signalAccuracyPercent', { percent: 92 }), available: true },
        { text: t('realtimeAlerts'), available: true },
        { text: t('24hourSupport'), available: true },
      ],
      isPopular: true,
      callToAction: t('subscribe'),
      disabled: false,
    },
    {
      id: 'vip',
      name: t('vipPlan'),
      price: '$149',
      period: t('monthly'),
      description: t('forSpecializedTraders'),
      color: 'from-amber-500 to-yellow-600',
      icon: <Medal className="h-5 w-5" />,
      features: [
        { text: t('allProFeatures'), available: true },
        { text: t('exclusiveVipSignals'), available: true },
        { text: t('signalAccuracyPercent', { percent: 95 }), available: true },
        { text: t('personalizedStrategy'), available: true },
        { text: t('privateConsultation'), available: true },
      ],
      isPopular: false,
      callToAction: t('subscribe'),
      disabled: false,
    }
  ];
  
  // مفوض التعامل مع ترقية الاشتراك
  const handleUpgrade = (planId: string) => {
    if (isProcessing) return;
    
    setSelectedPlan(planId);
    setIsProcessing(true);
    
    // محاكاة عملية الدفع - في التطبيق الحقيقي، يجب توجيه المستخدم إلى صفحة الدفع
    setTimeout(() => {
      upgradeMutation.mutate(planId);
    }, 1500);
  };
  
  // الحصول على المخطط الحالي للمستخدم
  const getCurrentPlan = () => {
    if (!user || !user.subscriptionLevel) {
      return 'free';
    }
    return user.subscriptionLevel;
  };
  
  const currentPlan = getCurrentPlan();
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('subscriptionPlans')}</title>
        <meta name="description" content={t('subscriptionMetaDescription')} />
      </Helmet>
      
      <div className="p-4 md:p-6">
        {/* عنوان الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{t('subscriptionPlans')}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('subscriptionPageDescription')}</p>
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
            const isDisabled = plan.disabled || isPlanActive || isProcessing;
            
            return (
              <Card 
                key={plan.id} 
                className={`overflow-hidden border-2 transition-all ${
                  isPlanActive 
                    ? 'border-primary shadow-md' 
                    : plan.isPopular 
                      ? 'border-primary/50 shadow-lg' 
                      : 'border-border hover:border-border/80 hover:shadow-sm'
                } ${plan.isPopular ? 'lg:-mt-2 lg:mb-2' : ''}`}
              >
                {plan.isPopular && (
                  <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-medium">
                    {t('mostPopular')}
                  </div>
                )}
                
                <CardHeader className={`${plan.isPopular ? 'pt-4' : 'pt-6'} pb-0 text-center`}>
                  <div className={`mx-auto rounded-full p-2.5 mb-4 bg-gradient-to-r ${plan.color} text-white`}>
                    {plan.icon}
                  </div>
                  <CardTitle className="text-xl mb-1">{plan.name}</CardTitle>
                  <CardDescription className="min-h-10">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-4 pb-0 text-center">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground"> / {plan.period}</span>
                    )}
                  </div>
                  
                  <ul className="space-y-3 text-start">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        {feature.available ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={feature.available ? '' : 'text-muted-foreground'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-6 pb-6">
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
                        <CreditCard className="mr-2 h-4 w-4" />
                        {plan.callToAction}
                      </>
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