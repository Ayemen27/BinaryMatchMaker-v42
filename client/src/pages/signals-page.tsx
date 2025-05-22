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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generateDummySignals } from '@/lib/utils/signal-generator';
import { 
  Loader2, 
  Search, 
  ArrowDownUp, 
  Clock, 
  Bitcoin, 
  RefreshCw,
  Filter 
} from 'lucide-react';
import { Helmet } from 'react-helmet';

export default function SignalsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState({
    asset: 'all',
    direction: 'all',
    timeframe: 'all',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch signals from API
  const { data: signals, isLoading, refetch } = useQuery<Signal[]>({
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

  // Handle refresh signals
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 800); // UX improvement for feedback
  };
  
  // Filter signals based on the selected filters
  const filteredSignals = signals?.filter(signal => {
    if (filter.asset !== 'all' && signal.asset !== filter.asset) return false;
    if (filter.direction !== 'all' && signal.type !== filter.direction) return false;
    // Skip timeframe filter if timeframes property is missing
    if (filter.timeframe !== 'all' && signal.timeframes && 
        Array.isArray(signal.timeframes) && 
        !signal.timeframes.includes(filter.timeframe)) return false;
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
      
      <div className="p-4 md:p-6 mx-auto max-w-[1360px]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bitcoin className="w-6 h-6 text-primary" />
              {t('signals')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('viewAllSignals')}</p>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refreshSignals')}
          </Button>
        </div>
        
        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  {t('filterSignals')}
                </CardTitle>
                <CardDescription>{t('useFiltersToFindSignals')}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" title={t('resetFilters')} 
                onClick={() => setFilter({ asset: 'all', direction: 'all', timeframe: 'all' })}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Bitcoin className="h-4 w-4" />
                  {t('asset')}
                </label>
                <Select
                  value={filter.asset}
                  onValueChange={(value) => setFilter({ ...filter, asset: value })}
                >
                  <SelectTrigger className="w-[160px] md:w-[180px] bg-background border shadow-sm">
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
              
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <ArrowDownUp className="h-4 w-4" />
                  {t('signalDirection')}
                </label>
                <Select
                  value={filter.direction}
                  onValueChange={(value) => setFilter({ ...filter, direction: value })}
                >
                  <SelectTrigger className="w-[160px] md:w-[180px] bg-background border shadow-sm">
                    <SelectValue placeholder={t('allDirections')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allDirections')}</SelectItem>
                    <SelectItem value="buy">{t('buy')}</SelectItem>
                    <SelectItem value="sell">{t('sell')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {t('timeframe')}
                </label>
                <Select
                  value={filter.timeframe}
                  onValueChange={(value) => setFilter({ ...filter, timeframe: value })}
                >
                  <SelectTrigger className="w-[160px] md:w-[180px] bg-background border shadow-sm">
                    <SelectValue placeholder={t('allTimeframes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allTimeframes')}</SelectItem>
                    <SelectItem value="1h">1 {t('hour')}</SelectItem>
                    <SelectItem value="4h">4 {t('hours')}</SelectItem>
                    <SelectItem value="1d">1 {t('day')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Active Filters */}
              {(filter.asset !== 'all' || filter.direction !== 'all' || filter.timeframe !== 'all') && (
                <div className="flex-1 flex flex-wrap items-center gap-2 mt-2 md:mt-0 md:justify-end">
                  {filter.asset !== 'all' && (
                    <Badge variant="outline" className="py-1 px-2 bg-primary/5 gap-1.5 border border-primary/20">
                      {filter.asset}
                      <button className="ml-1 text-muted-foreground hover:text-foreground" 
                        onClick={() => setFilter({ ...filter, asset: 'all' })}>
                        &times;
                      </button>
                    </Badge>
                  )}
                  {filter.direction !== 'all' && (
                    <Badge variant="outline" className="py-1 px-2 bg-primary/5 gap-1.5 border border-primary/20">
                      {t(filter.direction)}
                      <button className="ml-1 text-muted-foreground hover:text-foreground" 
                        onClick={() => setFilter({ ...filter, direction: 'all' })}>
                        &times;
                      </button>
                    </Badge>
                  )}
                  {filter.timeframe !== 'all' && (
                    <Badge variant="outline" className="py-1 px-2 bg-primary/5 gap-1.5 border border-primary/20">
                      {filter.timeframe}
                      <button className="ml-1 text-muted-foreground hover:text-foreground" 
                        onClick={() => setFilter({ ...filter, timeframe: 'all' })}>
                        &times;
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="active" className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-border pb-2 mb-6">
            <TabsList className="grid grid-cols-2 min-w-[280px] max-w-xs mb-4 sm:mb-0 bg-muted/40">
              <TabsTrigger value="active" className="rounded-md">
                {t('activeSignals')} 
                <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">
                  {activeSignals.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-md">
                {t('signalHistory')}
                <span className="ml-2 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-semibold">
                  {historicalSignals.length}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="hidden sm:inline">
                {filter.asset !== 'all' || filter.direction !== 'all' || filter.timeframe !== 'all' 
                  ? t('activeFilters') 
                  : t('noActiveFilters')}
              </span>
            </div>
          </div>
          
          <TabsContent value="active">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center bg-background/50 rounded-lg py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{t('loadingSignals')}</p>
              </div>
            ) : activeSignals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <div className="bg-background rounded-lg shadow-sm border border-border/40 p-8">
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">{t('noActiveSignals')}</h3>
                  <p className="text-muted-foreground max-w-md mb-5">{t('checkBackSoon')}</p>
                  
                  {(filter.asset !== 'all' || filter.direction !== 'all' || filter.timeframe !== 'all') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFilter({ asset: 'all', direction: 'all', timeframe: 'all' })}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('resetFilters')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center bg-background/50 rounded-lg py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{t('loadingSignals')}</p>
              </div>
            ) : historicalSignals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {historicalSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <div className="bg-background rounded-lg shadow-sm border border-border/40 p-8">
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">{t('noHistoricalSignals')}</h3>
                  <p className="text-muted-foreground max-w-md mb-5">{t('tryDifferentFilters')}</p>
                  
                  {(filter.asset !== 'all' || filter.direction !== 'all' || filter.timeframe !== 'all') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFilter({ asset: 'all', direction: 'all', timeframe: 'all' })}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('resetFilters')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
