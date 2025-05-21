import { Router } from 'express';
import { z } from 'zod';
import { TelegramPaymentService } from '../services/telegram-payment';
import { TelegramBotService } from '../services/telegram-bot';

// إنشاء مخطط للتحقق من بيانات الدفع
const miniAppPaymentSchema = z.object({
  action: z.string(),
  paymentId: z.string(),
  planType: z.string(),
  starsAmount: z.number().positive(),
  timestamp: z.number(),
  telegramUserId: z.string().optional(),
  telegramUsername: z.string().optional(),
  telegramFirstName: z.string().optional(),
  telegramLastName: z.string().optional()
});

const router = Router();

/**
 * نقطة نهاية لمعالجة بيانات الدفع من التطبيق المصغر
 */
router.post('/process-mini-app', async (req, res) => {
  try {
    console.log('[تطبيق تلجرام المصغر] استلام طلب معالجة دفع:', JSON.stringify(req.body).substring(0, 200));
    
    // التحقق من صحة البيانات
    let paymentData;
    try {
      paymentData = miniAppPaymentSchema.parse(req.body);
    } catch (error) {
      console.error('[تطبيق تلجرام المصغر] بيانات غير صالحة:', error);
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        error: error instanceof z.ZodError ? error.errors : 'خطأ في التحقق من البيانات'
      });
    }
    
    // حفظ طلب الدفع في قاعدة البيانات
    // يمكن استخدام خدمة التخزين لحفظ الطلب وسيتم معالجته عندما يكتمل الدفع من خلال بوت تلجرام
    
    // تحويل نوع الخطة إلى الصيغة الكاملة المستخدمة في النظام
    const fullPlanType = `${paymentData.planType}_plan`;
    
    // إعداد رابط الدفع لبوت تلجرام
    const botUsername = 'Payment_gateway_Binar_bot';
    let userParams = '';
    
    if (paymentData.telegramUserId) {
      userParams = `_${paymentData.telegramUserId}`;
      if (paymentData.telegramUsername) {
        userParams += `_${paymentData.telegramUsername}`;
      }
    }
    
    // إنشاء رابط بدء البوت مع معلمات الدفع
    const startParam = `pay_${paymentData.planType}_${paymentData.starsAmount}${userParams}`;
    const botUrl = `https://t.me/${botUsername}?start=${startParam}`;
    
    return res.status(200).json({
      success: true,
      message: 'تم استلام طلب الدفع بنجاح',
      paymentId: paymentData.paymentId,
      paymentStatus: 'pending',
      redirectUrl: botUrl
    });
  } catch (error) {
    console.error('[تطبيق تلجرام المصغر] خطأ في معالجة طلب الدفع:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة طلب الدفع'
    });
  }
});

/**
 * نقطة نهاية للتحقق من حالة الدفع
 */
router.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // التحقق من حالة الدفع باستخدام خدمة الدفع
    const result = await TelegramPaymentService.verifyPayment(paymentId);
    
    return res.status(200).json({
      success: true,
      verified: result.verified,
      paymentId,
      subscription: result.subscription,
      message: result.verified 
        ? 'تم التحقق من الدفع بنجاح' 
        : 'لم يتم العثور على معاملة الدفع أو لم تكتمل بعد'
    });
  } catch (error) {
    console.error('[تطبيق تلجرام المصغر] خطأ في التحقق من حالة الدفع:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من حالة الدفع'
    });
  }
});

/**
 * نقطة نهاية للحصول على روابط الاشتراك
 */
router.get('/subscription-links', (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const username = req.user?.username || 'guest';
    
    // إنشاء روابط الاشتراك المختلفة
    const botUsername = 'Payment_gateway_Binar_bot';
    
    const links = {
      weekly: `https://t.me/${botUsername}?start=pay_weekly_750_${userId}_${username}`,
      monthly: `https://t.me/${botUsername}?start=pay_monthly_2300_${userId}_${username}`,
      annual: `https://t.me/${botUsername}?start=pay_annual_10000_${userId}_${username}`,
      premium: `https://t.me/${botUsername}?start=pay_premium_18500_${userId}_${username}`
    };
    
    return res.status(200).json({
      success: true,
      links
    });
  } catch (error) {
    console.error('[تطبيق تلجرام المصغر] خطأ في إنشاء روابط الاشتراك:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء روابط الاشتراك'
    });
  }
});

export default router;