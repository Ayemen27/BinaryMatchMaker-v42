import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SubscriptionPlans() {
  const { t } = useTranslation();
  
  const plans = [
    {
      name: t('basicPlan'),
      price: '$29',
      period: t('monthly'),
      description: t('suitableForBeginners'),
      features: [
        { text: t('limitedSignals', { count: 10 }), available: true },
        { text: t('basicMarketAnalysis'), available: true },
        { text: t('signalAccuracyPercent', { percent: 85 }), available: true },
        { text: t('realtimeAlerts'), available: false },
        { text: t('advancedAnalytics'), available: false },
      ],
      isPopular: false,
    },
    {
      name: t('proPlan'),
      price: '$79',
      period: t('monthly'),
      description: t('forProfessionalTraders'),
      features: [
        { text: t('unlimitedSignals'), available: true },
        { text: t('advancedMarketAnalysis'), available: true },
        { text: t('signalAccuracyPercent', { percent: 92 }), available: true },
        { text: t('realtimeAlerts'), available: true },
        { text: t('vipExclusiveSignals'), available: false },
      ],
      isPopular: true,
    },
    {
      name: t('vipPlan'),
      price: '$149',
      period: t('monthly'),
      description: t('forSpecializedTraders'),
      features: [
        { text: t('allProFeatures'), available: true },
        { text: t('exclusiveVipSignals'), available: true },
        { text: t('signalAccuracyPercent', { percent: 95 }), available: true },
        { text: t('support247'), available: true },
        { text: t('privateConsultation'), available: true },
      ],
      isPopular: false,
    }
  ];
  
  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="border-b border-border p-4">
        <CardTitle>{t('subscriptionPlans')}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={cn(
                "bg-muted rounded-lg p-6 border-2 relative",
                plan.isPopular 
                  ? "border-primary md:scale-105 md:-translate-y-2" 
                  : "border-muted"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-center py-1 text-xs">
                  {t('mostPopular')}
                </div>
              )}
              
              <div className={cn("text-center mb-6", plan.isPopular && "mt-2")}>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">
                  {plan.price} <span className="text-base font-normal text-muted-foreground">/ {plan.period}</span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    {feature.available ? (
                      <Check className="h-4 w-4 text-success mr-2" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mr-2" />
                    )}
                    <span className={cn(
                      "text-sm",
                      !feature.available && "text-muted-foreground"
                    )}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button 
                variant={plan.isPopular ? "default" : "outline"} 
                className="w-full"
              >
                {t('subscribe')}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
