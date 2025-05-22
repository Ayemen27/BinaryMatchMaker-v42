import { Router } from 'express';
import { z } from 'zod';
import { TelegramPaymentService } from '../services/telegram-payment';

// وظيفة إرسال فاتورة الدفع بالنجوم
function sendInvoice(botToken: string, chatId: number | string, options: {
  title: string;
  description: string;
  payload: string;
  currency: string;
  prices: { label: string; amount: number }[];
}) {
  return fetch(`https://api.telegram.org/bot${botToken}/sendInvoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      title: options.title,
      description: options.description,
      payload: options.payload,
      provider_token: '', // لا حاجة لـ provider_token عند استخدام عملة XTR (النجوم)
      currency: options.currency,
      prices: options.prices.map(p => ({ label: p.label, amount: p.amount })),
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('[نظام دفع تلجرام] تم إرسال فاتورة الدفع بنجاح:', data);
    return data;
  })
  .catch(error => {
    console.error('[نظام دفع تلجرام] خطأ في إرسال فاتورة الدفع:', error);
    return null;
  });
}

// وظيفة تحديث اشتراك المستخدم
async function updateUserSubscription(userId: number | string, planType: string, amount: number, transactionId: string) {
  // تحويل نوع الخطة إلى تنسيق مناسب
  let plan = 'weekly_plan';
  if (planType === 'monthly') plan = 'monthly_plan';
  if (planType === 'annual') plan = 'annual_plan';
  if (planType === 'premium') plan = 'annual_plan';

  try {
    // استدعاء خدمة معالجة الدفع
    const result = await TelegramPaymentService.processPayment({
      userId: Number(userId),
      plan: plan as any,
      starsAmount: amount,
      paymentId: transactionId,
      telegramUserId: String(userId)
    });
    
    console.log('[نظام دفع تلجرام] تم تحديث اشتراك المستخدم بنجاح:', result);
    return result;
  } catch (error) {
    console.error('[نظام دفع تلجرام] خطأ في تحديث اشتراك المستخدم:', error);
    return null;
  }
}
import * as crypto from 'crypto';

// مخطط التحقق من بيانات الدفع
const telegramPaymentSchema = z.object({
  userId: z.number().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  starsAmount: z.number().positive(),
  paymentId: z.string(),
  paymentStatus: z.enum(['pending', 'completed', 'failed']),
  plan: z.enum(['weekly_plan', 'monthly_plan', 'annual_plan']),
  botVersion: z.string().optional(),
  fullName: z.string(),
  country: z.string().optional(),
  phone: z.string().optional(),
  telegramUserId: z.string().optional(),
  isVerified: z.boolean().default(false),
});

// إنشاء موجه للتعامل مع مسارات دفع تلجرام
const router = Router();

/**
 * نقطة نهاية لاستقبال طلبات الدفع من بوت تلجرام
 */
router.post('/webhook', async (req, res) => {
  try {
    // طباعة محتوى الطلب للتشخيص
    console.log('[نظام دفع تلجرام] استلام طلب:', JSON.stringify(req.body).substring(0, 200));
    
    // التحقق مما إذا كان هذا تحديث من بوت تلجرام
    if (req.body && typeof req.body.update_id !== 'undefined') {
      console.log('[نظام دفع تلجرام] تم التعرف على تحديث بوت تلجرام');
      
      // معالجة الرسائل من بوت تلجرام
      if (req.body.message) {
        const message = req.body.message;
        const chatId = message.chat?.id;
        const text = message.text || '';
        const userId = message.from?.id;
        
        console.log(`[نظام دفع تلجرام] رسالة من المستخدم ${chatId}: ${text}`);
        
        // الرد على المستخدم
        if (chatId) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          if (botToken) {
            let responseText = `تم استلام رسالتك: "${text}"\nشكرًا لتواصلك مع BinarJoin Analytics.`;
            
            // معالجة أوامر محددة
            if (text.startsWith('/start')) {
              responseText = `أهلاً بك في بوت BinarJoin Analytics! 👋\n\n`
                + `للاشتراك في خدماتنا المتميزة، يمكنك استخدام الأوامر التالية:\n`
                + `/plans - عرض خطط الاشتراك\n`
                + `/weekly - شراء الخطة الأسبوعية\n`
                + `/monthly - شراء الخطة الشهرية\n`
                + `/annual - شراء الخطة السنوية\n`
                + `/premium - شراء خطة BinarJoin V.4.1`;
            } else if (text.startsWith('/plans')) {
              responseText = `📋 خطط الاشتراك المتاحة:\n\n`
                + `🔸 الخطة الأسبوعية - 750 نجمة\n`
                + `🔸 الخطة الشهرية - 2300 نجمة\n`
                + `🔸 الخطة السنوية - 10000 نجمة\n`
                + `🔸 خطة BinarJoin V.4.1 - 18500 نجمة\n\n`
                + `للاشتراك في أي خطة، استخدم الأمر المناسب:\n`
                + `/weekly, /monthly, /annual, /premium`;
            } else if (text.startsWith('/weekly')) {
              // إرسال فاتورة للخطة الأسبوعية
              setTimeout(() => {
                sendInvoice(botToken, chatId, {
                  title: "الخطة الأسبوعية",
                  description: "تحليل أساسي للسوق في الوقت الحقيقي - صالح لمدة أسبوع واحد",
                  payload: `weekly_${userId}_${Date.now()}`,
                  currency: "XTR",
                  prices: [{ label: "الخطة الأسبوعية", amount: 750 }]
                });
              }, 500);
              
              responseText = `⭐ جاري إعداد فاتورة الدفع للخطة الأسبوعية...`;
            } else if (text.startsWith('/monthly')) {
              // إرسال فاتورة للخطة الشهرية
              setTimeout(() => {
                sendInvoice(botToken, chatId, {
                  title: "الخطة الشهرية",
                  description: "تحليل فني متقدم للسوق + إشارات تداول - صالح لمدة شهر كامل",
                  payload: `monthly_${userId}_${Date.now()}`,
                  currency: "XTR",
                  prices: [{ label: "الخطة الشهرية", amount: 2300 }]
                });
              }, 500);
              
              responseText = `⭐ جاري إعداد فاتورة الدفع للخطة الشهرية...`;
            } else if (text.startsWith('/annual')) {
              // إرسال فاتورة للخطة السنوية
              setTimeout(() => {
                sendInvoice(botToken, chatId, {
                  title: "الخطة السنوية",
                  description: "تحليل مدعوم بالذكاء الاصطناعي + استراتيجيات مخصصة - صالح لمدة سنة كاملة",
                  payload: `annual_${userId}_${Date.now()}`,
                  currency: "XTR",
                  prices: [{ label: "الخطة السنوية", amount: 10000 }]
                });
              }, 500);
              
              responseText = `⭐ جاري إعداد فاتورة الدفع للخطة السنوية...`;
            } else if (text.startsWith('/premium')) {
              // إرسال فاتورة للخطة المتميزة
              setTimeout(() => {
                sendInvoice(botToken, chatId, {
                  title: "خطة BinarJoin V.4.1",
                  description: "أحدث إصدار مع تحليل متطور وإشارات دقيقة - صالح لمدة سنة كاملة",
                  payload: `premium_${userId}_${Date.now()}`,
                  currency: "XTR",
                  prices: [{ label: "خطة BinarJoin V.4.1", amount: 18500 }]
                });
              }, 500);
              
              responseText = `⭐ جاري إعداد فاتورة الدفع للخطة المتميزة...`;
            }
            
            setTimeout(() => {
              fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: responseText
                })
              })
              .then(response => response.json())
              .then(data => {
                console.log('[نظام دفع تلجرام] تم إرسال الرد بنجاح:', data.ok);
              })
              .catch(error => {
                console.error('[نظام دفع تلجرام] خطأ في إرسال الرد:', error);
              });
            }, 100);
          }
        }
      }
      
      // معالجة الدفعات الناجحة
      if (req.body.message && req.body.message.successful_payment) {
        const payment = req.body.message.successful_payment;
        const chatId = req.body.message.chat?.id;
        const userId = req.body.message.from?.id;
        
        console.log(`[نظام دفع تلجرام] تم استلام دفع ناجح:`, payment);
        
        // استخراج معلومات الخطة من payload
        const payloadParts = payment.invoice_payload.split('_');
        const planType = payloadParts[0];
        
        // إرسال تأكيد للمستخدم
        if (chatId && userId) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          if (botToken) {
            setTimeout(() => {
              fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `✅ تم الدفع بنجاح!\n\n`
                    + `💰 المبلغ: ${payment.total_amount} نجمة\n`
                    + `📋 معرف المعاملة: ${payment.telegram_payment_charge_id}\n\n`
                    + `🎉 سيتم تفعيل اشتراكك فوراً. شكراً لثقتك! 🌟`
                })
              })
              .then(response => response.json())
              .then(data => {
                console.log('[نظام دفع تلجرام] تم إرسال تأكيد الدفع بنجاح:', data.ok);
              })
              .catch(error => {
                console.error('[نظام دفع تلجرام] خطأ في إرسال تأكيد الدفع:', error);
              });
            }, 100);
            
            // تحديث اشتراك المستخدم في قاعدة البيانات
            // هذا سيتم تنفيذه في وظيفة منفصلة
            updateUserSubscription(userId, planType, payment.total_amount, payment.telegram_payment_charge_id);
          }
        }
      }
      
      // معالجة استعلامات ما قبل الدفع
      if (req.body.pre_checkout_query) {
        const preCheckout = req.body.pre_checkout_query;
        const queryId = preCheckout.id;
        
        console.log(`[نظام دفع تلجرام] استعلام ما قبل الدفع:`, preCheckout);
        
        // دائمًا نقبل استعلامات ما قبل الدفع في هذه المرحلة
        if (queryId) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          if (botToken) {
            setTimeout(() => {
              fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pre_checkout_query_id: queryId,
                  ok: true
                })
              })
              .then(response => response.json())
              .then(data => {
                console.log('[نظام دفع تلجرام] تم الرد على استعلام ما قبل الدفع بنجاح:', data.ok);
              })
              .catch(error => {
                console.error('[نظام دفع تلجرام] خطأ في الرد على استعلام ما قبل الدفع:', error);
              });
            }, 100);
          }
        }
      }
      
      // يجب دائمًا إرسال استجابة 200 OK لتحديثات البوت بسرعة
      return res.status(200).send('OK');
    }
    
    // إذا وصلنا إلى هنا، فهو طلب دفع عادي وليس تحديث بوت
    const authToken = req.headers['x-telegram-bot-auth'];
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const payloadSignature = req.headers['x-telegram-signature'];
    const requestTimestamp = req.headers['x-request-timestamp'];
    
    // في بيئة الإنتاج، نقوم بالتحققات الأمنية
    if (process.env.NODE_ENV === 'production') {
      // التحقق من رمز التحقق
      if (!authToken) {
        console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - لا يوجد رمز تحقق');
        return res.status(403).json({
          success: false,
          message: 'غير مصرح بالوصول - رمز التحقق غير موجود'
        });
      }
      
      // التحقق من التوقيع والطابع الزمني
      if (!payloadSignature || !requestTimestamp) {
        console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - بيانات توقيع ناقصة');
        return res.status(403).json({
          success: false,
          message: 'غير مصرح بالوصول - بيانات التوقيع غير مكتملة'
        });
      }
      
      // التحقق من عمر الطلب
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = Number(requestTimestamp);
      const maxAge = 300; // 5 دقائق كحد أقصى
      
      if (isNaN(requestTime) || currentTime - requestTime > maxAge) {
        console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - طلب منتهي الصلاحية');
        return res.status(403).json({
          success: false,
          message: 'غير مصرح بالوصول - الطلب منتهي الصلاحية'
        });
      }
      
      // التحقق من صحة التوقيع
      if (botToken && payloadSignature) {
        const payload = JSON.stringify(req.body);
        const dataToSign = `${payload}.${requestTimestamp}`;
        
        const expectedSignature = crypto
          .createHmac('sha256', botToken)
          .update(dataToSign)
          .digest('hex');
        
        if (payloadSignature !== expectedSignature) {
          console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - توقيع غير صالح');
          return res.status(403).json({
            success: false,
            message: 'غير مصرح بالوصول - توقيع غير صالح'
          });
        }
      }
    }
    
    console.log('[نظام دفع تلجرام] استلام طلب دفع:', req.body);
    
    // التحقق من صحة البيانات
    let paymentData;
    try {
      paymentData = telegramPaymentSchema.parse(req.body);
    } catch (error) {
      console.error('[نظام دفع تلجرام] بيانات غير صالحة:', error);
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        error: error instanceof z.ZodError ? error.errors : 'خطأ في التحقق من البيانات'
      });
    }
    
    // البحث عن المستخدم بواسطة البريد الإلكتروني إذا كان متوفرًا
    let userId = paymentData.userId;
    
    if (!userId && paymentData.email) {
      const user = await TelegramPaymentService.findUserByEmail(paymentData.email);
      if (user) {
        userId = user.id;
      }
    }
    
    // البحث عن المستخدم بواسطة اسم المستخدم إذا كان متوفرًا
    if (!userId && paymentData.username) {
      const user = await TelegramPaymentService.findUserByUsername(paymentData.username);
      if (user) {
        userId = user.id;
      }
    }
    
    // إذا لم يتم العثور على المستخدم، حفظ طلب الدفع للتحقق اليدوي لاحقًا
    if (!userId) {
      // يمكن إضافة سجل في جدول منفصل للطلبات المعلقة
      console.warn('[نظام دفع تلجرام] لم يتم العثور على المستخدم:', paymentData);
      return res.status(200).json({
        success: true,
        status: 'pending',
        message: 'تم استلام طلب الدفع ولكن لم يتم العثور على المستخدم. ستتم المعالجة يدويًا.'
      });
    }
    
    // التحقق من حالة الدفع
    if (paymentData.paymentStatus === 'completed' && paymentData.isVerified) {
      // معالجة الدفع باستخدام خدمة تلجرام
      const result = await TelegramPaymentService.processPayment({
        userId,
        plan: paymentData.plan,
        starsAmount: paymentData.starsAmount,
        paymentId: paymentData.paymentId,
        telegramUserId: paymentData.telegramUserId
      });
      
      return res.status(200).json({
        success: true,
        status: 'activated',
        userId,
        subscriptionType: result.type,
        endDate: result.endDate,
        message: 'تم تفعيل الاشتراك بنجاح'
      });
    } else {
      // تسجيل الدفع كمعلق في انتظار التحقق
      return res.status(200).json({
        success: true,
        status: 'pending_verification',
        userId,
        plan: paymentData.plan,
        message: 'تم استلام طلب الدفع وهو في انتظار التحقق'
      });
    }
    
  } catch (error) {
    console.error('[نظام دفع تلجرام] خطأ في معالجة طلب الدفع:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة طلب الدفع'
    });
  }
});

/**
 * نقطة نهاية للتحقق من حالة الدفع
 */
router.get('/verify/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول'
      });
    }
    
    // التحقق من دور المستخدم (يجب أن يكون مسؤولاً) - سيتم تنفيذه لاحقًا
    
    // التحقق من الدفع باستخدام خدمة تلجرام
    const result = await TelegramPaymentService.verifyPayment(paymentId);
    
    return res.status(200).json({
      success: true,
      verified: result.verified,
      paymentId,
      message: 'تم التحقق من الدفع بنجاح'
    });
  } catch (error) {
    console.error('[نظام دفع تلجرام] خطأ في التحقق من الدفع:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الدفع'
    });
  }
});

/**
 * نقطة نهاية لإكمال عملية الدفع يدويًا (للإدارة)
 */
router.post('/complete/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { userId, plan, starsAmount = 0 } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول'
      });
    }
    
    if (!userId || !plan) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير كاملة'
      });
    }
    
    // معالجة الدفع باستخدام خدمة تلجرام
    const result = await TelegramPaymentService.processPayment({
      userId,
      plan,
      starsAmount,
      paymentId
    });
    
    return res.status(200).json({
      success: true,
      activated: true,
      userId,
      subscriptionType: result.type,
      endDate: result.endDate,
      message: 'تم تفعيل الاشتراك بنجاح'
    });
  } catch (error) {
    console.error('[نظام دفع تلجرام] خطأ في إكمال الدفع:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إكمال الدفع'
    });
  }
});

export default router;