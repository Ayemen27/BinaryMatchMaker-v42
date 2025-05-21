import { Router } from 'express';
import { z } from 'zod';
import { TelegramPaymentService } from '../services/telegram-payment';
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
    // التحقق من مصدر الطلب باستخدام توقيع رقمي آمن
    const authToken = req.headers['x-telegram-bot-auth'];
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const payloadSignature = req.headers['x-telegram-signature'];
    const requestTimestamp = req.headers['x-request-timestamp'];
    
    // في بيئة الإنتاج، يجب التحقق من صحة الطلب
    if (!authToken && process.env.NODE_ENV === 'production') {
      console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - لا يوجد رمز تحقق');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - رمز التحقق غير موجود'
      });
    }
    
    // في بيئة الإنتاج، يجب التحقق من توقيع الطلب لمنع هجمات MITM
    if (process.env.NODE_ENV === 'production') {
      // التحقق من وجود توقيع وطابع زمني
      if (!payloadSignature || !requestTimestamp) {
        console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - بيانات توقيع ناقصة');
        return res.status(403).json({
          success: false,
          message: 'غير مصرح بالوصول - بيانات التوقيع غير مكتملة'
        });
      }
      
      // التحقق من عمر الطلب (منع هجمات إعادة التشغيل)
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
        // إنشاء نص للتوقيع (يتضمن بيانات الطلب والطابع الزمني)
        const payload = JSON.stringify(req.body);
        const dataToSign = `${payload}.${requestTimestamp}`;
        
        // إنشاء توقيع HMAC باستخدام مفتاح البوت
        const expectedSignature = crypto
          .createHmac('sha256', botToken)
          .update(dataToSign)
          .digest('hex');
        
        // التحقق من تطابق التوقيعات
        if (payloadSignature !== expectedSignature) {
          console.warn('[نظام دفع تلجرام] محاولة وصول غير مصرح بها - توقيع غير صالح');
          return res.status(403).json({
            success: false,
            message: 'غير مصرح بالوصول - توقيع غير صالح'
          });
        }
      }
    }
    
    // التحقق من عنوان IP للطلب (في تطبيق إنتاجي، يجب التحقق من قائمة العناوين المسموح بها)
    // يمكن إضافة قائمة بعناوين IP خوادم تلجرام للتحقق منها
    
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