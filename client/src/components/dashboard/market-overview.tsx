import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarketData {
  asset: string;
  price: string;
  change: string;
  isPositive: boolean;
}

export function MarketOverview() {
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week'>('day');
  
  const marketData: MarketData[] = [
    { asset: 'BTC/USDT', price: '37,540.00', change: '+2.4%', isPositive: true },
    { asset: 'ETH/USDT', price: '2,105.75', change: '-0.8%', isPositive: false },
    { asset: 'SOL/USDT', price: '98.45', change: '+5.2%', isPositive: true },
    { asset: 'XRP/USDT', price: '0.6245', change: '-1.5%', isPositive: false },
  ];

  const timeframeOptions = [
    { key: 'hour', label: t('hour') },
    { key: 'day', label: t('day') },
    { key: 'week', label: t('week') },
  ];
  
  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <CardTitle>{t('marketOverview')}</CardTitle>
          <div className="flex space-x-2 rtl:space-x-reverse">
            {timeframeOptions.map((option) => (
              <Button
                key={option.key}
                variant={timeframe === option.key ? 'default' : 'outline'}
                size="sm"
                className="h-8"
                onClick={() => setTimeframe(option.key as 'hour' | 'day' | 'week')}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      {/* Chart Container */}
      <div className="chart-container p-4">
        <div className="chart-gradient"></div>
        <svg viewBox="0 0 1000 300" className="chart-line">
          <path d="M0,250 C50,220 100,260 150,200 C200,140 250,250 300,200 C350,150 400,190 450,120 C500,50 550,100 600,80 C650,60 700,90 750,40 C800,-10 850,50 900,90 C950,130 1000,150 1000,150" />
        </svg>
        <div className="chart-points">
          <div className="buy-point" style={{ left: '30%', top: '60%' }}>
            <div className="chart-tooltip" style={{ top: '-40px', left: '50%' }}>
              {t('buyPoint')}: 37,540.00 USDT
            </div>
          </div>
          <div className="sell-point" style={{ left: '75%', top: '30%' }}>
            <div className="chart-tooltip" style={{ top: '-40px', left: '50%' }}>
              {t('sellPoint')}: 38,750.00 USDT
            </div>
          </div>
        </div>
      </div>
      
      {/* Market Data */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
        {marketData.map((data, index) => (
          <div 
            key={index} 
            className={cn(
              "p-4", 
              index < marketData.length - 1 && "border-r border-border rtl:border-l rtl:border-r-0"
            )}
          >
            <p className="text-sm text-muted-foreground">{data.asset}</p>
            <p className="font-semibold">{data.price}</p>
            <p className={cn("text-xs", data.isPositive ? "text-success" : "text-destructive")}>
              {data.change}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
