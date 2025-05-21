import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, Check, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const TelegramPaymentGuidePage = () => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // استخراج معلومات الدفع من عنوان URL
  const searchParams = new URLSearchParams(window.location.search);
  const planType = searchParams.get('plan') || 'weekly';
  const starsAmount = searchParams.get('stars') || '750';
  const botCommand = `/pay ${planType} ${starsAmount}`;
  
  // اسم البوت الصحيح
  const botUsername = 'Payment_gateway_Binar_bot';
  const telegramBotUrl = `https://t.me/${botUsername}`;
  
  // نسخ الأمر إلى الحافظة
  const copyCommand = () => {
    navigator.clipboard.writeText(botCommand)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        toast({
          title: t('commandCopied'),
          description: t('pasteCommandInBot'),
          duration: 3000,
        });
      })
      .catch(err => {
        console.error('فشل في نسخ الأمر:', err);
        toast({
          title: t('copyFailed'),
          description: t('tryManualCopy'),
          variant: 'destructive',
          duration: 3000,
        });
      });
  };
  
  // الانتقال إلى بوت تلجرام
  const goToTelegram = () => {
    window.open(telegramBotUrl, '_blank');
  };
  
  // العودة إلى صفحة الاشتراكات
  const goBack = () => {
    navigate('/subscription');
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={goBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToSubscriptions')}
      </Button>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('telegramStarsPayment')}</h1>
        <p className="text-muted-foreground">{t('completePaymentWithTelegramStars')}</p>
      </div>
      
      <Card className="p-6 mb-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('paymentDetails')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('plan')}</p>
                <p className="font-medium">{t(planType + 'Plan')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('starsAmount')}</p>
                <p className="font-medium">{starsAmount} {t('stars')}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('howToComplete')}</h2>
            <ol className="list-decimal list-inside space-y-4 rtl:list-inside">
              <li className="py-1">{t('openTelegramBot')}</li>
              <li className="py-1">{t('sendCommandToBot')}</li>
              <li className="py-1">{t('followBotInstructions')}</li>
              <li className="py-1">{t('returnToWebsite')}</li>
            </ol>
          </div>
          
          <div className="border border-border rounded-md p-4">
            <h3 className="text-lg font-medium mb-2">{t('botCommand')}</h3>
            <div className="flex items-center justify-between bg-muted p-3 rounded-md">
              <code className="font-mono text-sm">{botCommand}</code>
              <Button 
                size="sm"
                variant="ghost"
                onClick={copyCommand}
                aria-label={t('copyCommand')}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={goToTelegram} className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          {t('openTelegramBot')}
        </Button>
        <Button variant="outline" onClick={goBack}>
          {t('backToSubscriptions')}
        </Button>
      </div>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>{t('telegramPaymentNote')}</p>
      </div>
    </div>
  );
};

export default TelegramPaymentGuidePage;