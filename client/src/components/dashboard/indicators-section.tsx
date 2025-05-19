import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, BarChartHorizontal, TrendingUp } from 'lucide-react';

export function IndicatorsSection() {
  const { t } = useTranslation();
  
  const indicators = [
    {
      name: t('rsiIndicator'),
      description: t('rsiDescription'),
      icon: LineChart,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary'
    },
    {
      name: t('macdIndicator'),
      description: t('macdDescription'),
      icon: BarChartHorizontal,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary'
    },
    {
      name: t('bollingerBands'),
      description: t('bollingerDescription'),
      icon: TrendingUp,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary'
    }
  ];
  
  return (
    <Card className="shadow-lg overflow-hidden mb-6">
      <CardHeader className="border-b border-border p-4">
        <CardTitle>{t('technicalIndicators')}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.map((indicator, index) => (
            <div key={index} className="bg-muted rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className={`${indicator.iconBg} ${indicator.iconColor} rounded-full p-2 mr-3`}>
                  <indicator.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{indicator.name}</h3>
                  <p className="text-xs text-muted-foreground">{indicator.name}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{indicator.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
