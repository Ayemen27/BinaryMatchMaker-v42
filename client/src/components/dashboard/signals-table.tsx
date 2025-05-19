import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Signal } from '@/types';
import { Badge } from '@/components/ui/badge';

interface SignalsTableProps {
  signals: Signal[];
}

export function SignalsTable({ signals }: SignalsTableProps) {
  const { t } = useTranslation();
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  
  // Filter signals based on selections
  const filteredSignals = signals.filter(signal => {
    if (selectedAsset !== 'all' && signal.asset !== selectedAsset) {
      return false;
    }
    return true;
  });

  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="border-b border-border p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>{t('signalHistory')}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="w-[140px]">
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
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('timeRange')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('last7Days')}</SelectItem>
                <SelectItem value="30d">{t('last30Days')}</SelectItem>
                <SelectItem value="90d">{t('last90Days')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted text-muted-foreground text-sm">
              <th className="px-4 py-3 text-left">{t('asset')}</th>
              <th className="px-4 py-3 text-left">{t('type')}</th>
              <th className="px-4 py-3 text-left">{t('entryPrice')}</th>
              <th className="px-4 py-3 text-left">{t('targetPrice')}</th>
              <th className="px-4 py-3 text-left">{t('stopLoss')}</th>
              <th className="px-4 py-3 text-left">{t('accuracy')}</th>
              <th className="px-4 py-3 text-left">{t('status')}</th>
              <th className="px-4 py-3 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSignals.map((signal) => (
              <tr key={signal.id} className="border-b border-border hover:bg-muted/50 transition duration-150">
                <td className="px-4 py-3">
                  <div className="font-semibold">{signal.asset}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "font-semibold",
                    signal.type === 'buy' ? "text-success" : "text-destructive"
                  )}>
                    {signal.type === 'buy' ? t('buy') : t('sell')}
                  </span>
                </td>
                <td className="px-4 py-3">{signal.entryPrice}</td>
                <td className="px-4 py-3">{signal.targetPrice}</td>
                <td className="px-4 py-3">{signal.stopLoss}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="w-16 bg-muted rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full" 
                        style={{ width: `${signal.accuracy}%` }}
                      ></div>
                    </div>
                    <span className="ml-2">{signal.accuracy}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={signal.status === 'active' ? 'default' : 'secondary'}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs",
                      signal.status === 'active' ? "bg-primary/20 text-primary hover:bg-primary/20" : 
                      "bg-secondary/50 hover:bg-secondary/50 text-muted-foreground"
                    )}
                  >
                    {signal.status === 'active' ? t('active') : t('completed')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="text-primary hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <CardFooter className="border-t border-border p-4 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {t('showing')} 1-{Math.min(filteredSignals.length, 5)} {t('of')} {filteredSignals.length}
        </span>
        <div className="flex space-x-1 rtl:space-x-reverse">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
            <span className="sr-only">{t('previousPage')}</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">{t('nextPage')}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
