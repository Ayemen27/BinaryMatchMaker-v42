import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { TelegramPaymentButton } from '@/components/telegram-payment-button';
import { useTranslation } from 'react-i18next';
import { useTelegramMiniApp } from '@/hooks/use-telegram-mini-app';
import { X, Star, CreditCard, DollarSign } from 'lucide-react';

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  planType: string;
  planName: string;
  price: number;
  starsAmount: number;
  userId?: number | string;
}

export function PaymentPopup({
  isOpen,
  onClose,
  planType,
  planName,
  price,
  starsAmount,
  userId
}: PaymentPopupProps) {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stars' | 'credit'>('stars');
  const dialogRef = useRef<HTMLDivElement>(null);
  const { isTelegramMiniApp } = useTelegramMiniApp();

  // تطبيق تأثير إغلاق بسلاسة
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  // إغلاق النافذة المنبثقة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`payment-popup max-w-md mx-auto p-0 rounded-xl overflow-hidden ${isClosing ? 'closing' : ''}`}
        ref={dialogRef}
      >
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">{t('selectPaymentMethod')}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-2 text-sm opacity-90">
            {t('plan')}: <span className="font-semibold">{planName}</span>
          </div>
        </DialogHeader>

        <div className="p-4">
          <div className="payment-methods grid grid-cols-1 gap-3 mb-4">
            <Button
              variant={selectedMethod === 'stars' ? 'default' : 'outline'}
              className={`payment-method-button flex justify-between items-center h-16 ${
                selectedMethod === 'stars' ? 'bg-blue-600 text-white' : ''
              }`}
              onClick={() => setSelectedMethod('stars')}
            >
              <div className="flex items-center gap-3">
                <div className="payment-icon bg-blue-100 text-blue-600 rounded-full p-2 flex items-center justify-center">
                  <Star className="h-5 w-5" />
                </div>
                <div className="payment-info text-left">
                  <div className="text-sm font-medium">{t('telegramStars')}</div>
                  <div className="text-xs opacity-80">{t('instantActivation')}</div>
                </div>
              </div>
              <div className="payment-price font-bold">
                {starsAmount} {t('stars')}
              </div>
            </Button>

            <Button
              variant={selectedMethod === 'credit' ? 'default' : 'outline'}
              className={`payment-method-button flex justify-between items-center h-16 ${
                selectedMethod === 'credit' ? 'bg-blue-600 text-white' : ''
              }`}
              onClick={() => setSelectedMethod('credit')}
            >
              <div className="flex items-center gap-3">
                <div className="payment-icon bg-blue-100 text-blue-600 rounded-full p-2 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="payment-info text-left">
                  <div className="text-sm font-medium">{t('creditCard')}</div>
                  <div className="text-xs opacity-80">{t('securePayment')}</div>
                </div>
              </div>
              <div className="payment-price font-bold">
                <DollarSign className="h-3 w-3 inline" />
                {price}
              </div>
            </Button>
          </div>

          <div className="payment-user-info mb-4">
            <div className="text-sm text-gray-500 mb-2">{t('userInfo')}</div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="user-id text-sm">
                {t('userId')}: <span className="font-mono">{userId || 'غير مسجل'}</span>
              </div>
              <div className="plan-type text-sm">
                {t('planType')}: <span className="font-medium">{planName}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4">
          {selectedMethod === 'stars' ? (
            <TelegramPaymentButton
              planType={planType as any}
              starsAmount={starsAmount}
              userId={userId}
              buttonText={t('proceedWithStars')}
              className="w-full"
            />
          ) : (
            <Button 
              className="w-full" 
              onClick={handleClose}
              disabled={isTelegramMiniApp} // تعطيل في التطبيق المصغر
            >
              {t('proceedToCreditCard')}
            </Button>
          )}
          <div className="text-xs text-center text-gray-500 mt-2">
            {t('byProceedingYouAgree')} <a href="/terms" className="text-blue-600">{t('termsAndConditions')}</a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}