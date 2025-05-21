import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * صفحة الدفع المبسطة لتلجرام
 * تعرض معلومات الخطط المتاحة وتوجه المستخدم مباشرة إلى البوت
 */
export default function TelegramPaymentDirect() {
  const [selectedPlan, setSelectedPlan] = useState('');
  // استخدام معرف حقيقي للبوت
  const [botLink, setBotLink] = useState('https://t.me/tester_bot');
  
  // خطط الاشتراك المتاحة
  const plans = [
    { id: 'weekly', name: 'الخطة الأسبوعية', price: 750, period: 'أسبوع واحد' },
    { id: 'monthly', name: 'الخطة الشهرية', price: 2300, period: 'شهر كامل' },
    { id: 'annual', name: 'الخطة السنوية', price: 10000, period: 'سنة كاملة' },
    { id: 'premium', name: 'خطة BinarJoin V.4.1', price: 18500, period: 'سنة كاملة' }
  ];

  // اختيار خطة
  const selectPlan = (planId: string) => {
    setSelectedPlan(planId);
    // إنشاء رابط البوت مع الأمر المناسب (سيتم إضافة اسم المستخدم الصحيح للبوت لاحقاً)
    setBotLink(`https://t.me/BinarJoinAnalyticBot?start=${planId}`);
  };

  // الانتقال إلى البوت
  const goToBot = () => {
    // إظهار رسالة توجيهية للمستخدم
    alert(`للاشتراك في الخطة، سيتم توجيهك إلى بوت التلجرام الخاص بنا.\n\nيمكنك إرسال الأمر التالي للبوت:\n/${selectedPlan}`);
    
    // فتح البوت في نافذة جديدة
    window.open(botLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">الدفع بنجوم تلجرام</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">اختر خطة الاشتراك المناسبة لك</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {plans.map(plan => (
            <Card 
              key={plan.id} 
              className={`cursor-pointer transition-all ${
                selectedPlan === plan.id ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500' : ''
              }`}
              onClick={() => selectPlan(plan.id)}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.period}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">{plan.price} ⭐</span>
                  <Button 
                    variant={selectedPlan === plan.id ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectPlan(plan.id);
                    }}
                  >
                    {selectedPlan === plan.id ? "✓ تم الاختيار" : "اختيار"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-8 text-center">
          <h2 className="text-xl font-bold mb-4">كيفية الدفع بنجوم تلجرام</h2>
          <ol className="list-decimal text-start space-y-2 mr-6 mb-6">
            <li>اختر إحدى الخطط من الأعلى</li>
            <li>انقر على زر "الذهاب إلى بوت تلجرام"</li>
            <li>سيتم فتح محادثة مع البوت في تلجرام</li>
            <li>ابدأ محادثة مع البوت بإرسال الأمر <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">/start</span></li>
            <li>اختر نفس الخطة في البوت باستخدام الأمر المناسب (مثل <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">/weekly</span>)</li>
            <li>سيظهر لك البوت فاتورة دفع بنجوم تلجرام</li>
            <li>أكمل عملية الدفع بنقرة واحدة</li>
            <li>سيتم تفعيل اشتراكك فور إتمام عملية الدفع</li>
          </ol>

          <Button 
            onClick={goToBot} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            disabled={!selectedPlan}
          >
            {selectedPlan ? `الذهاب إلى بوت تلجرام - ${plans.find(p => p.id === selectedPlan)?.name}` : 'الرجاء اختيار خطة أولاً'}
          </Button>
        </div>

        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>لديك استفسار؟ تواصل مع الدعم الفني عبر بوت تلجرام الخاص بنا</p>
        </div>
      </div>
    </div>
  );
}