import { Router } from 'express';
import { storage } from '../storage';
import { subscriptionTypeEnum } from '@shared/schema';
import { z } from 'zod';

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
    // التحقق من بوت التلجرام باستخدام رمز التحقق (سيتم تنفيذه لاحقًا)
    // يجب أن يكون هناك التحقق من المصدر باستخدام رمز سري مشترك أو توقيع
    
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
      const user = await storage.getUserByEmail(paymentData.email);
      if (user) {
        userId = user.id;
      }
    }
    
    // البحث عن المستخدم بواسطة اسم المستخدم إذا كان متوفرًا
    if (!userId && paymentData.username) {
      const user = await storage.getUserByUsername(paymentData.username);
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
    
    // تحديد نوع الاشتراك بناءً على الخطة المختارة
    let subscriptionType: "free" | "basic" | "pro" | "vip" = "free";
    let durationInDays = 0;
    
    switch(paymentData.plan) {
      case 'weekly_plan':
        subscriptionType = "basic";
        durationInDays = 7;
        break;
      case 'monthly_plan':
        subscriptionType = "pro";
        durationInDays = 30;
        break;
      case 'annual_plan':
        subscriptionType = "vip";
        durationInDays = 365;
        break;
    }
    
    // التحقق من حالة الدفع
    if (paymentData.paymentStatus === 'completed' && paymentData.isVerified) {
      // حساب تاريخ انتهاء الاشتراك
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationInDays);
      
      // التحقق من وجود اشتراك حالي
      const existingSubscription = await storage.getUserSubscription(userId);
      
      if (existingSubscription) {
        // تحديث الاشتراك الحالي
        await storage.updateSubscription(existingSubscription.id, {
          type: subscriptionType,
          startDate,
          endDate,
          isActive: true,
          paymentMethod: 'telegram_stars',
          amount: paymentData.starsAmount,
          currency: 'STARS',
          transactionId: paymentData.paymentId
        });
      } else {
        // إنشاء اشتراك جديد
        await storage.createSubscription({
          userId,
          type: subscriptionType,
          startDate,
          endDate,
          isActive: true,
          paymentMethod: 'telegram_stars',
          amount: paymentData.starsAmount,
          currency: 'STARS',
          transactionId: paymentData.paymentId
        });
      }
      
      // تحديث مستوى اشتراك المستخدم في جدول المستخدمين
      await storage.updateUserSubscriptionLevel(userId, subscriptionType, endDate);
      
      // إرسال إشعار للمستخدم
      await storage.createNotification({
        userId,
        type: 'subscription',
        title: 'تم تفعيل الاشتراك',
        message: `تم تفعيل اشتراكك بنجاح (${subscriptionType}) حتى تاريخ ${endDate.toLocaleDateString('ar-SA')}`,
        read: false
      });
      
      return res.status(200).json({
        success: true,
        status: 'activated',
        userId,
        subscriptionType,
        endDate,
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
    
    // البحث عن الدفع في قاعدة البيانات (سيتم إضافته لاحقًا)
    // في الوقت الحالي نفترض أنه تم التحقق بنجاح
    
    return res.status(200).json({
      success: true,
      verified: true,
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
    const { userId, plan } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول'
      });
    }
    
    // تحديد نوع الاشتراك بناءً على الخطة المختارة
    let subscriptionType: "free" | "basic" | "pro" | "vip" = "free";
    let durationInDays = 0;
    
    switch(plan) {
      case 'weekly_plan':
        subscriptionType = "basic";
        durationInDays = 7;
        break;
      case 'monthly_plan':
        subscriptionType = "pro";
        durationInDays = 30;
        break;
      case 'annual_plan':
        subscriptionType = "vip";
        durationInDays = 365;
        break;
    }
    
    if (!userId || !plan) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير كاملة'
      });
    }
    
    // حساب تاريخ انتهاء الاشتراك
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);
    
    // التحقق من وجود اشتراك حالي
    const existingSubscription = await storage.getUserSubscription(userId);
    
    if (existingSubscription) {
      // تحديث الاشتراك الحالي
      await storage.updateSubscription(existingSubscription.id, {
        type: subscriptionType,
        startDate,
        endDate,
        isActive: true,
        paymentMethod: 'telegram_stars',
        transactionId: paymentId
      });
    } else {
      // إنشاء اشتراك جديد
      await storage.createSubscription({
        userId,
        type: subscriptionType,
        startDate,
        endDate,
        isActive: true,
        paymentMethod: 'telegram_stars',
        transactionId: paymentId
      });
    }
    
    // تحديث مستوى اشتراك المستخدم في جدول المستخدمين
    await storage.updateUserSubscriptionLevel(userId, subscriptionType, endDate);
    
    // إرسال إشعار للمستخدم
    await storage.createNotification({
      userId,
      type: 'subscription',
      title: 'تم تفعيل الاشتراك',
      message: `تم تفعيل اشتراكك بنجاح (${subscriptionType}) حتى تاريخ ${endDate.toLocaleDateString('ar-SA')}`,
      read: false
    });
    
    return res.status(200).json({
      success: true,
      activated: true,
      userId,
      subscriptionType,
      endDate,
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