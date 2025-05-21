import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTelegramMiniApp } from '@/hooks/use-telegram-mini-app';

type PaymentStatus = 'loading' | 'success' | 'error';

/**
 * صفحة نتيجة الدفع بنجوم تلجرام
 * تُستخدم لعرض نتيجة عملية الدفع للمستخدم
 */
export default function TelegramPaymentResult() {
  const [location] = useLocation();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [message, setMessage] = useState('جاري التحقق من حالة الدفع...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const { closeApp, showAlert } = useTelegramMiniApp();

  // استخراج معلومات الدفع من معلمات عنوان URL
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const paymentId = searchParams.get('payment_id');
  const planType = searchParams.get('plan');
  const starsAmount = searchParams.get('amount');
  
  // التحقق من حالة الدفع عند تحميل الصفحة
  useEffect(() => {
    if (!paymentId) {
      setStatus('error');
      setMessage('معلومات الدفع غير صالحة. الرجاء المحاولة مرة أخرى.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/telegram-mini-app/payment-status/${paymentId}`);
        const data = await response.json();

        if (response.ok && data.verified) {
          setStatus('success');
          setMessage('تم التحقق من الدفع بنجاح! تم تفعيل اشتراكك.');
          setPaymentDetails(data.subscription);
        } else {
          setStatus('error');
          setMessage(data.message || 'فشل في التحقق من الدفع. الرجاء المحاولة مرة أخرى لاحقًا.');
        }
      } catch (error) {
        console.error('خطأ أثناء التحقق من حالة الدفع:', error);
        setStatus('error');
        setMessage('حدث خطأ أثناء التحقق من الدفع. الرجاء المحاولة مرة أخرى لاحقًا.');
      }
    };

    verifyPayment();
  }, [paymentId]);

  // المسار الرئيسي
  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  // إغلاق التطبيق المصغر
  const handleCloseApp = () => {
    showAlert('شكرًا لاستخدامك خدمتنا!');
    setTimeout(() => {
      closeApp();
    }, 1500);
  };

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">نتيجة الدفع بنجوم تلجرام</CardTitle>
          <CardDescription className="text-center">
            {planType && starsAmount && (
              <>خطة {planType === 'weekly' ? 'أسبوعية' : planType === 'monthly' ? 'شهرية' : planType === 'annual' ? 'سنوية' : 'متميزة'} - {starsAmount} نجمة</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 mb-4 animate-spin" />
              <p className="text-center text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <AlertTitle>تم الدفع بنجاح!</AlertTitle>
              </div>
              <AlertDescription>
                {message}
                {paymentDetails && (
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-900">
                    <h4 className="font-medium mb-2">تفاصيل الاشتراك:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>نوع الخطة: {paymentDetails.type}</li>
                      <li>تاريخ البدء: {new Date(paymentDetails.start_date).toLocaleDateString('ar-SA')}</li>
                      <li>تاريخ الانتهاء: {new Date(paymentDetails.end_date).toLocaleDateString('ar-SA')}</li>
                      <li>حد الإشارات اليومي: {paymentDetails.daily_signal_limit}</li>
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <AlertTitle>فشل في التحقق من الدفع</AlertTitle>
              </div>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleGoHome} className="w-full" variant="default">
            الذهاب إلى لوحة التحكم
          </Button>
          <Button onClick={handleCloseApp} className="w-full" variant="outline">
            إغلاق
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}