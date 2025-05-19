import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Signal } from '@/types';

interface SignalCardProps {
  signal: Signal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const { t } = useTranslation();
  
  const typeColorClass = signal.type === 'buy' 
    ? "bg-success/20 text-success" 
    : "bg-destructive/20 text-destructive";
  
  const typeBorderClass = signal.type === 'buy' 
    ? "border-success" 
    : "border-destructive";
  
  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">{signal.asset}</h3>
          <span className={cn("px-3 py-1 rounded-full text-sm", typeColorClass)}>
            {signal.type === 'buy' ? t('buy') : t('sell')}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <p className="text-muted-foreground">{t('entryPrice')}</p>
            <p className="font-semibold">{signal.entryPrice}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('targetPrice')}</p>
            <p className="font-semibold">{signal.targetPrice}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('stopLoss')}</p>
            <p className="font-semibold">{signal.stopLoss}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('signalAccuracy')}</p>
            <p className="font-semibold">{signal.accuracy}%</p>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-success h-1.5 rounded-full" 
              style={{ width: `${signal.accuracy}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {signal.indicators.map((indicator, index) => (
            <span key={index} className="px-2 py-0.5 bg-muted rounded text-xs">
              {indicator}
            </span>
          ))}
        </div>
        
        <div className={cn("border-t pt-3 flex justify-between items-center", typeBorderClass)}>
          <span className="text-sm text-muted-foreground flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {signal.time}
          </span>
          <Button size="sm">{t('details')}</Button>
        </div>
      </div>
    </div>
  );
}
