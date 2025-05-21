import { Router } from 'express';
import { TelegramPaymentService } from '../services/telegram-payment';

// إنشاء موجه للتعامل مع طلبات التطبيق المصغر لتلجرام
const router = Router();

/**
 * نقطة نهاية لمعالجة طلبات الدفع من التطبيق المصغر
 * هذا المسار يستقبل بيانات JSON من التطبيق المصغر لتلجرام
 */
router.post('/process-payment', async (req, res) => {
  try {
    console.log('[تطبيق تلجرام المصغر] استلام طلب دفع:', req.body);
    
    // التحقق من وجود البيانات المطلوبة
    const { paymentId, planId, starsAmount, userId } = req.body;
    
    if (!paymentId || !planId || !starsAmount) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير مكتملة. يرجى توفير معرف الدفع ونوع الخطة وعدد النجوم.'
      });
    }
    
    // إعداد معرف المستخدم (استخدام معرف افتراضي إذا لم يكن متوفرًا)
    const userIdToUse = userId || 1; // يمكن تغييره وفقًا لمنطق التطبيق
    const telegramUserId = req.body.userId ? req.body.userId.toString() : undefined;
    
    // معالجة الدفع باستخدام خدمة الدفع بالنجوم
    const result = await TelegramPaymentService.processPayment({
      userId: userIdToUse,
      plan: planId,
      starsAmount: parseInt(starsAmount, 10),
      paymentId,
      telegramUserId
    });
    
    if (result.success) {
      console.log('[تطبيق تلجرام المصغر] تمت معالجة الدفع بنجاح:', {
        paymentId,
        planId,
        subscriptionType: result.type
      });
      
      return res.json({
        success: true,
        message: 'تمت معالجة الدفع بنجاح',
        subscription: {
          type: result.type,
          endDate: result.endDate
        }
      });
    } else {
      throw new Error('فشل في معالجة الدفع');
    }
  } catch (error) {
    console.error('[تطبيق تلجرام المصغر] خطأ في معالجة الدفع:', error);
    
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الدفع',
      error: (error as Error).message
    });
  }
});

/**
 * نقطة نهاية للتحقق من صحة طلب الدفع
 */
router.get('/verify-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الدفع مطلوب'
      });
    }
    
    // التحقق من صحة الدفع
    const verificationResult = await TelegramPaymentService.verifyPayment(paymentId);
    
    return res.json({
      success: verificationResult.verified,
      verified: verificationResult.verified,
      message: verificationResult.verified ? 'تم التحقق من الدفع بنجاح' : 'فشل في التحقق من الدفع',
      details: verificationResult
    });
  } catch (error) {
    console.error('[تطبيق تلجرام المصغر] خطأ في التحقق من الدفع:', error);
    
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الدفع',
      error: (error as Error).message
    });
  }
});

/**
 * نقطة نهاية للحصول على معلومات المستخدم لتلجرام
 */
router.get('/user-info/:telegramUserId', async (req, res) => {
  try {
    const { telegramUserId } = req.params;
    
    if (!telegramUserId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
    }
    
    // البحث عن المستخدم في قاعدة البيانات - هذا مثال يجب تغييره حسب هيكل البيانات
    // يمكن استخدام معرف تلجرام للبحث عن المستخدم المرتبط في قاعدة البيانات
    
    // إرجاع بيانات وهمية للتجربة (يجب استبدالها ببيانات حقيقية)
    return res.json({
      success: true,
      user: {
        id: 1,
        telegramUserId,
        subscription: {
          type: 'free',
          expiryDate: null
        }
      }
    });
  } catch (error) {
    console.error('[تطبيق تلجرام المصغر] خطأ في الحصول على معلومات المستخدم:', error);
    
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الحصول على معلومات المستخدم',
      error: (error as Error).message
    });
  }
});

export default router;