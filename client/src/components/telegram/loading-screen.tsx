import { Star } from 'lucide-react';

interface LoadingScreenProps {
  t: any;
  text?: string;
}

export function LoadingScreen({ text, t }: LoadingScreenProps) {
  return (
    <div className="telegram-loader-container">
      <div className="telegram-loader-icon">
        <div className="telegram-loader-icon-pulse"></div>
        <div className="telegram-loader-icon-inner"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Star className="h-12 w-12 text-primary animate-pulse" />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2 text-center">{t('loadingTelegramApp')}</h2>
        <p className="text-muted-foreground text-center max-w-xs">{t('preparingPaymentInterface')}</p>
      </div>
      
      <div className="w-full max-w-[192px] mt-8">
        <div className="telegram-loader-progress">
          <div className="telegram-loader-progress-bar"></div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 text-center">{text || t('connectingToTelegram')}</p>
      </div>
    </div>
  );
}