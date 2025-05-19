import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Signal } from '@/types';

interface SignalCardProps {
  signal: Signal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const { t } = useTranslation();
  
  const isActive = signal.status === 'active';
  
  // Types and styles configuration
  const typeConfig = {
    buy: {
      icon: TrendingUp,
      colorClass: "bg-success/20 text-success border-success",
      gradientClass: "from-success/5 to-success/0",
      badgeClass: "bg-success/15 text-success hover:bg-success/20",
      accuracyBarClass: "bg-success"
    },
    sell: {
      icon: TrendingDown,
      colorClass: "bg-destructive/20 text-destructive border-destructive",
      gradientClass: "from-destructive/5 to-destructive/0",
      badgeClass: "bg-destructive/15 text-destructive hover:bg-destructive/20",
      accuracyBarClass: "bg-destructive"
    }
  };
  
  const config = typeConfig[signal.type];
  const TypeIcon = config.icon;
  
  // Calculate potential profit percentage
  const calculateProfit = () => {
    if (signal.type === 'buy') {
      const entry = parseFloat(signal.entryPrice);
      const target = parseFloat(signal.targetPrice);
      if (!isNaN(entry) && !isNaN(target) && entry > 0) {
        return ((target - entry) / entry * 100).toFixed(2);
      }
    } else {
      const entry = parseFloat(signal.entryPrice);
      const target = parseFloat(signal.targetPrice);
      if (!isNaN(entry) && !isNaN(target) && entry > 0) {
        return ((entry - target) / entry * 100).toFixed(2);
      }
    }
    return "0.00";
  };
  
  const profitPercentage = calculateProfit();
  
  // Result badge for completed signals
  const getResultBadge = () => {
    if (signal.status === 'completed' && signal.result) {
      return signal.result === 'success' ? (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          {t('successResult')}
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          {t('failureResult')}
        </Badge>
      );
    }
    return null;
  };
  
  return (
    <div className={cn(
      "rounded-lg overflow-hidden transition-all hover:shadow-md border",
      isActive 
        ? "border-border dark:border-border/50" 
        : "border-border/10 dark:border-border/5 opacity-85",
      "bg-card dark:bg-card/95"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4",
        signal.type === 'buy' 
          ? "bg-gradient-to-br from-success/5 to-transparent dark:from-success/10 dark:to-transparent" 
          : "bg-gradient-to-br from-destructive/5 to-transparent dark:from-destructive/10 dark:to-transparent"
      )}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-foreground">{signal.asset}</h3>
            {signal.platform && (
              <Badge variant="outline" className="bg-background/50 dark:bg-background/20 border-border/40 dark:border-border/30 text-xs px-1.5 py-0">
                {signal.platform}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {getResultBadge()}
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center px-2 py-1 gap-1 transition-colors shadow-sm", 
                signal.type === 'buy'
                  ? "bg-success/10 dark:bg-success/20 text-success border-success/20 dark:border-success/30"
                  : "bg-destructive/10 dark:bg-destructive/20 text-destructive border-destructive/20 dark:border-destructive/30"
              )}
            >
              <TypeIcon className="h-3 w-3" />
              {signal.type === 'buy' ? t('buy') : t('sell')}
            </Badge>
          </div>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
              <Target className="h-3 w-3" />
              {t('entryPrice')}
            </p>
            <p className="font-semibold text-foreground">{signal.entryPrice}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
              <Target className="h-3 w-3" />
              {t('targetPrice')}
            </p>
            <p className="font-semibold text-foreground">{signal.targetPrice}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              {t('stopLoss')}
            </p>
            <p className="font-semibold text-foreground">{signal.stopLoss}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
              <BarChart3 className="h-3 w-3" />
              {t('potentialProfit')}
            </p>
            <p className="font-semibold text-success dark:text-success/90">+{profitPercentage}%</p>
          </div>
        </div>
        
        {/* Accuracy bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t('signalAccuracy')}</span>
            <span className="font-medium text-foreground">{signal.accuracy}%</span>
          </div>
          <div className="w-full bg-muted/50 dark:bg-muted/30 rounded-full h-1.5 overflow-hidden">
            <div 
              className={cn(
                "h-1.5 rounded-full", 
                signal.type === 'buy' 
                  ? "bg-success dark:bg-success/90" 
                  : "bg-destructive dark:bg-destructive/90"
              )} 
              style={{ width: `${signal.accuracy}%` }}
            ></div>
          </div>
        </div>
        
        {/* Indicators */}
        {signal.indicators.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {signal.indicators.map((indicator, index) => (
              <span 
                key={index} 
                className="px-2 py-0.5 border-border/30 dark:border-border/20 bg-background/60 dark:bg-background/30 border rounded-md text-xs text-foreground/90"
              >
                {indicator}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2.5 flex justify-between items-center border-t border-border/10 dark:border-border/5 bg-card dark:bg-card/95">
        <span className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1.5" />
          {signal.time}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-8 gap-1 hover:bg-primary/5 dark:hover:bg-primary/10 text-primary"
        >
          {t('details')}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
