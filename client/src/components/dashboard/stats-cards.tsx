import { useTranslation } from 'react-i18next';
import { Activity, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  activeSignals: number;
  accuracy: number;
  successfulSignals: number;
  failedSignals: number;
}

export function StatsCards({ 
  activeSignals = 3, 
  accuracy = 92, 
  successfulSignals = 128, 
  failedSignals = 11 
}: Partial<StatsCardsProps>) {
  const { t } = useTranslation();
  
  const stats = [
    {
      title: t('activeSignals'),
      value: activeSignals,
      icon: Activity,
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary'
    },
    {
      title: t('signalAccuracy'),
      value: `${accuracy}%`,
      icon: BarChart3,
      iconBg: 'bg-success/20',
      iconColor: 'text-success'
    },
    {
      title: t('successfulSignals'),
      value: successfulSignals,
      icon: CheckCircle,
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning'
    },
    {
      title: t('failedSignals'),
      value: failedSignals,
      icon: XCircle,
      iconBg: 'bg-destructive/20',
      iconColor: 'text-destructive'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`rounded-full ${stat.iconBg} p-3 mr-4`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{stat.title}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
