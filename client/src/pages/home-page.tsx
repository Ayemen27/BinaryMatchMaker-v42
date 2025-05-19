import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { MarketOverview } from '@/components/dashboard/market-overview';
import { SignalsList } from '@/components/dashboard/signals-list';
import { SignalsTable } from '@/components/dashboard/signals-table';
import { IndicatorsSection } from '@/components/dashboard/indicators-section';
import { SubscriptionPlans } from '@/components/dashboard/subscription-plans';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Signal } from '@/types';
import { generateDummySignals } from '@/lib/utils/signal-generator';
import { Helmet } from 'react-helmet';

export default function HomePage() {
  const { t } = useTranslation();
  
  // Fetch signals from API
  const { data: signals, isLoading } = useQuery<Signal[]>({
    queryKey: ['/api/signals'],
    // If the API fails, fallback to generated signals for demo
    queryFn: async () => {
      try {
        const res = await fetch('/api/signals');
        if (!res.ok) throw new Error('Failed to fetch signals');
        return await res.json();
      } catch (error) {
        console.error('Error fetching signals, using generated data:', error);
        return generateDummySignals(10);
      }
    },
  });
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('dashboard')}</title>
        <meta name="description" content="High accuracy trading signals and analytics for binary options" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
            <p className="text-muted-foreground">{t('signalsAndPerformance')}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button>
              <Bell className="h-4 w-4 mr-2" />
              {t('notifications')}
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <StatsCards />
        
        {/* Market Overview & Live Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <MarketOverview />
          </div>
          
          <div>
            <SignalsList signals={signals || []} />
          </div>
        </div>
        
        {/* Signal History Table */}
        <div className="mb-6">
          <SignalsTable signals={signals || []} />
        </div>
        
        {/* Trading Indicators Section */}
        <IndicatorsSection />
        
        {/* Subscription Plans */}
        <SubscriptionPlans />
      </div>
    </Layout>
  );
}
