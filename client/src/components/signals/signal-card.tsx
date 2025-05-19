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
      // Using vibrant green colors like in Binance
      colorClass: "bg-[#16c784] text-white border-[#16c784]",
      gradientClass: "from-[#16c784]/10 to-transparent",
      badgeClass: "bg-[#16c784] text-white hover:bg-[#0fb976]",
      // Signal color theme for buy
      borderClass: "border-[#16c784]/50",
      headerClass: "bg-[#16c784]/5",
      highlightClass: "text-[#16c784] font-semibold",
      accuracyBarClass: "bg-[#16c784]",
      bgClass: "bg-[#effcf6]", // Light background for light mode
      darkBgClass: "dark:bg-[#071f13]", // Dark background for dark mode
      percentageClass: "text-[#16c784]"
    },
    sell: {
      icon: TrendingDown,
      // Using vibrant red colors like in Binance
      colorClass: "bg-[#ea3943] text-white border-[#ea3943]",
      gradientClass: "from-[#ea3943]/10 to-transparent",
      badgeClass: "bg-[#ea3943] text-white hover:bg-[#d5323b]",
      // Signal color theme for sell
      borderClass: "border-[#ea3943]/50",
      headerClass: "bg-[#ea3943]/5",
      highlightClass: "text-[#ea3943] font-semibold",
      accuracyBarClass: "bg-[#ea3943]",
      bgClass: "bg-[#fdf1f1]", // Light background for light mode
      darkBgClass: "dark:bg-[#230d0d]", // Dark background for dark mode
      percentageClass: "text-[#ea3943]"
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
        ? signal.type === 'buy'
          ? "border-[#16c784]/30" 
          : "border-[#ea3943]/30"
        : "border-border/10 dark:border-border/5 opacity-85",
      signal.type === 'buy' ? config.bgClass : config.bgClass,
      signal.type === 'buy' ? config.darkBgClass : config.darkBgClass
    )}>
      {/* Header */}
      <div className={cn(
        "p-4",
        signal.type === 'buy' 
          ? "bg-gradient-to-br from-[#16c784]/5 to-transparent dark:from-[#16c784]/10 dark:to-transparent" 
          : "bg-gradient-to-br from-[#ea3943]/5 to-transparent dark:from-[#ea3943]/10 dark:to-transparent"
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
                "flex items-center px-2.5 py-1 gap-1.5 transition-colors shadow-sm", 
                signal.type === 'buy'
                  ? "bg-[#16c784] text-white border-[#16c784]/30 font-medium"
                  : "bg-[#ea3943] text-white border-[#ea3943]/30 font-medium"
              )}
            >
              <TypeIcon className="h-3.5 w-3.5" />
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
            <p className={cn(
              "font-semibold", 
              signal.type === 'buy' ? "text-[#16c784]" : "text-[#ea3943]"
            )}>{signal.targetPrice}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              {t('stopLoss')}
            </p>
            <p className="font-semibold text-[#ea3943]">{signal.stopLoss}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
              <BarChart3 className="h-3 w-3" />
              {t('potentialProfit')}
            </p>
            <p className="font-semibold text-[#16c784]">+{profitPercentage}%</p>
          </div>
        </div>
        
        {/* Accuracy bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t('signalAccuracy')}</span>
            <span className={cn(
              "font-medium",
              signal.type === 'buy' ? "text-[#16c784]" : "text-[#ea3943]"
            )}>{signal.accuracy}%</span>
          </div>
          <div className="w-full bg-muted/50 dark:bg-muted/30 rounded-full h-2 overflow-hidden">
            <div 
              className={cn(
                "h-2 rounded-full shadow-inner", 
                signal.type === 'buy' 
                  ? "bg-[#16c784]" 
                  : "bg-[#ea3943]"
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
                className="px-2 py-0.5 border-border/30 dark:border-border/20 bg-background/80 dark:bg-background/30 border rounded-md text-xs text-foreground/90"
              >
                {indicator}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2.5 flex justify-between items-center border-t border-border/10 dark:border-border/5 bg-white dark:bg-card/95">
        <span className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1.5" />
          {signal.time}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "text-xs h-8 gap-1",
            signal.type === 'buy'
              ? "text-[#16c784] hover:bg-[#16c784]/10"
              : "text-[#ea3943] hover:bg-[#ea3943]/10"
          )}
        >
          {t('details')}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
