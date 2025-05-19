import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { SignalCard } from '@/components/signals/signal-card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { Signal } from '@/types';

interface SignalsListProps {
  signals: Signal[];
  limit?: number;
}

export function SignalsList({ signals, limit = 3 }: SignalsListProps) {
  const { t } = useTranslation();
  const limitedSignals = signals.slice(0, limit);
  
  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="border-b border-border p-4">
        <CardTitle>{t('latestSignals')}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {limitedSignals.length > 0 ? (
          limitedSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('noSignalsAvailable')}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t border-border p-4">
        <Link href="/signals">
          <Button variant="link" className="w-full text-primary">
            {t('viewAllSignals')} 
            <ChevronRight className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
