import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { useQuery } from '@tanstack/react-query';
import { Signal } from '@/types';
import { SignalCard } from '@/components/signals/signal-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateDummySignals } from '@/lib/utils/signal-generator';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

export default function SignalsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState({
    asset: 'all',
    direction: 'all',
    timeframe: 'all',
  });
  
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
        return generateDummySignals(12);
      }
    },
  });
  
  // Filter signals based on the selected filters
  const filteredSignals = signals?.filter(signal => {
    if (filter.asset !== 'all' && signal.asset !== filter.asset) return false;
    if (filter.direction !== 'all' && signal.type !== filter.direction) return false;
    return true;
  }) || [];
  
  // Active and historical signals
  const activeSignals = filteredSignals.filter(signal => signal.status === 'active');
  const historicalSignals = filteredSignals.filter(signal => signal.status !== 'active');
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('signals')}</title>
        <meta name="description" content="View and filter our high-accuracy binary options trading signals" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('signals')}</h1>
          <p className="text-muted-foreground">{t('viewAllSignals')}</p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('filterSignals')}</CardTitle>
            <CardDescription>{t('useFiltersToFindSignals')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-full sm:w-auto">
                <Select
                  value={filter.asset}
                  onValueChange={(value) => setFilter({ ...filter, asset: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('allAssets')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allAssets')}</SelectItem>
                    <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                    <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                    <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                    <SelectItem value="DOGE/USDT">DOGE/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-auto">
                <Select
                  value={filter.direction}
                  onValueChange={(value) => setFilter({ ...filter, direction: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('signalDirection')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allDirections')}</SelectItem>
                    <SelectItem value="buy">{t('buy')}</SelectItem>
                    <SelectItem value="sell">{t('sell')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-auto">
                <Select
                  value={filter.timeframe}
                  onValueChange={(value) => setFilter({ ...filter, timeframe: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('timeframe')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allTimeframes')}</SelectItem>
                    <SelectItem value="1h">1 {t('hour')}</SelectItem>
                    <SelectItem value="4h">4 {t('hours')}</SelectItem>
                    <SelectItem value="1d">1 {t('day')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="active">
              {t('activeSignals')} 
              <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-xs">
                {activeSignals.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="history">
              {t('signalHistory')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {isLoading ? (
              <div className="flex justify-center my-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeSignals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-2">{t('noActiveSignals')}</p>
                  <p className="text-sm text-muted-foreground">{t('checkBackSoon')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {isLoading ? (
              <div className="flex justify-center my-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : historicalSignals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {historicalSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-2">{t('noHistoricalSignals')}</p>
                  <p className="text-sm text-muted-foreground">{t('checkBackSoon')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
