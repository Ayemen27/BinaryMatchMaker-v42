import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { SignalsList } from '@/components/dashboard/signals-list';
import { SignalsTable } from '@/components/dashboard/signals-table';
import { IndicatorsSection } from '@/components/dashboard/indicators-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Zap, TrendingUp, User, Link, ExternalLink, BarChart3, PieChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Signal } from '@/types';
import { generateDummySignals } from '@/lib/utils/signal-generator';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // استرجاع الإشارات من واجهة برمجة التطبيقات
  const { data: signals, isLoading } = useQuery<Signal[]>({
    queryKey: ['/api/signals'],
    // في حالة فشل واجهة برمجة التطبيقات، نرجع إلى بيانات تجريبية مولدة تلقائيًا
    queryFn: async () => {
      try {
        const res = await fetch('/api/signals');
        if (!res.ok) throw new Error('فشل في استرجاع الإشارات');
        return await res.json();
      } catch (error) {
        console.error('خطأ في استرجاع الإشارات، استخدام بيانات مولدة تلقائيًا:', error);
        return generateDummySignals(10);
      }
    },
  });
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('dashboard')}</title>
        <meta name="description" content={t('dashboardMetaDescription')} />
      </Helmet>
      
      <div className="p-4 md:p-6">
        {/* ترويسة الصفحة مع ترحيب شخصي */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">{t('welcomeMessage', { name: user?.fullName || user?.username || 'مستخدم' })}</h1>
              <p className="text-muted-foreground">{t('dashboardWelcomeDescription')}</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Button variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                {t('notifications')}
              </Button>
              <Button>
                <Zap className="h-4 w-4 mr-2" />
                {t('newSignal')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* بطاقات الإحصائيات */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary" />
            {t('performanceOverview')}
          </h2>
          <StatsCards />
        </div>
        
        {/* نظرة عامة على السوق والإشارات المباشرة */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-border hover:shadow-md transition-shadow duration-300">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  {t('marketOverview')}
                </CardTitle>
                <CardDescription>{t('marketOverviewDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <MarketOverview />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="shadow-sm border-border hover:shadow-md transition-shadow duration-300 h-full">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary" />
                  {t('liveSignals')}
                </CardTitle>
                <CardDescription>{t('liveSignalsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SignalsList signals={signals || []} />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* جدول تاريخ الإشارات */}
        <div className="mb-8">
          <Card className="shadow-sm border-border hover:shadow-md transition-shadow duration-300">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-primary" />
                  {t('signalHistory')}
                </CardTitle>
                <Button variant="outline" size="sm" className="ml-auto">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('viewAll')}
                </Button>
              </div>
              <CardDescription>{t('signalHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <SignalsTable signals={signals || []} />
            </CardContent>
          </Card>
        </div>
        
        {/* قسم مؤشرات التداول */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Link className="h-5 w-5 mr-2 text-primary" />
            {t('tradingInsights')}
          </h2>
          <IndicatorsSection />
        </div>
        
        {/* زر الترقية للنسخة المدفوعة */}
        <div className="mb-8">
          <Card className="bg-primary/5 border-primary/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{t('upgradeToProPlan')}</h3>
                  <p className="text-muted-foreground">{t('upgradeProDescription')}</p>
                </div>
                <Button 
                  className="bg-gradient-to-r from-primary to-primary-foreground/80 border-0 hover:from-primary/90 hover:to-primary-foreground/70 text-white"
                  onClick={() => window.location.href = '/subscriptions'}
                >
                  {t('viewSubscriptionPlans')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
