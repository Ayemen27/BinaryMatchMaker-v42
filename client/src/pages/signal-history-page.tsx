import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SignalsTable } from '@/components/dashboard/signals-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Signal } from '@/types';
import { generateDummySignals } from '@/lib/utils/signal-generator';
import { ChevronDown, Download, Filter, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format } from 'date-fns';
import { Helmet } from 'react-helmet';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignalHistoryPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('7d');
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  
  // Fetch signals from API
  const { data: signals, isLoading } = useQuery<Signal[]>({
    queryKey: ['/api/signals/history'],
    // If the API fails, fallback to generated signals for demo
    queryFn: async () => {
      try {
        const res = await fetch('/api/signals/history');
        if (!res.ok) throw new Error('Failed to fetch signal history');
        return await res.json();
      } catch (error) {
        console.error('Error fetching signal history, using generated data:', error);
        return generateDummySignals(20, { statusRatio: { active: 0.2, completed: 0.8 } });
      }
    },
  });
  
  // Calculate performance metrics
  const totalSignals = signals?.length || 0;
  const successfulSignals = signals?.filter(s => s.accuracy >= 90).length || 0;
  const failedSignals = totalSignals - successfulSignals;
  const successRate = totalSignals ? Math.round((successfulSignals / totalSignals) * 100) : 0;
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('signalHistory')}</title>
        <meta name="description" content="Review historical trading signals performance and analysis" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('signalHistory')}</h1>
            <p className="text-muted-foreground">{t('reviewPastSignals')}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {t('filter')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('filterSignals')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('asset')}</label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder={t('allAssets')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allAssets')}</SelectItem>
                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                        <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                        <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                        <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('signalType')}</label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder={t('allTypes')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allTypes')}</SelectItem>
                        <SelectItem value="buy">{t('buy')}</SelectItem>
                        <SelectItem value="sell">{t('sell')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('dateRange')}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                              </>
                            ) : (
                              format(dateRange.from, "PPP")
                            )
                          ) : (
                            <span>{t('pickADate')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{
                            from: dateRange.from,
                            to: dateRange.to,
                          }}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              setDateRange({ from: range.from, to: range.to });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">{t('reset')}</Button>
                  <Button>{t('apply')}</Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('export')}
            </Button>
          </div>
        </div>
        
        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">{t('totalSignals')}</p>
                <h3 className="text-3xl font-bold">{totalSignals}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">{t('successRate')}</p>
                <h3 className="text-3xl font-bold text-success">{successRate}%</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">{t('successfulSignals')}</p>
                <h3 className="text-3xl font-bold text-success">{successfulSignals}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">{t('failedSignals')}</p>
                <h3 className="text-3xl font-bold text-destructive">{failedSignals}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Time Period Selection */}
        <Card className="mb-6">
          <CardHeader className="border-b border-border p-4">
            <CardTitle>{t('selectTimePeriod')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={period === '7d' ? 'default' : 'outline'}
                onClick={() => setPeriod('7d')}
              >
                {t('last7Days')}
              </Button>
              <Button 
                variant={period === '30d' ? 'default' : 'outline'}
                onClick={() => setPeriod('30d')}
              >
                {t('last30Days')}
              </Button>
              <Button 
                variant={period === '90d' ? 'default' : 'outline'}
                onClick={() => setPeriod('90d')}
              >
                {t('last90Days')}
              </Button>
              <Button 
                variant={period === 'custom' ? 'default' : 'outline'}
                onClick={() => setPeriod('custom')}
              >
                {t('customRange')}
              </Button>
            </div>
            
            {period === 'custom' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('fromDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {format(dateRange.from, "PPP")}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('toDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {format(dateRange.to, "PPP")}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Signal History Table */}
        {isLoading ? (
          <div className="flex justify-center my-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <SignalsTable signals={signals || []} />
        )}
      </div>
    </Layout>
  );
}
