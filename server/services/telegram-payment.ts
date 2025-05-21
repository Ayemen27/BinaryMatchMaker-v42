import { db } from '../db';
import { subscriptions, users, notifications } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

/**
 * خدمة التعامل مع مدفوعات نجوم تلجرام
 */
export class TelegramPaymentService {
  /**
   * معالجة دفع نجوم تلجرام
   */
  static async processPayment(params: {
    userId: number;
    plan: string;
    starsAmount: number;
    paymentId: string;
    telegramUserId?: string;
  }) {
    const { userId, plan, starsAmount, paymentId, telegramUserId } = params;
    
    console.log('[دفع النجوم] معالجة دفع نجوم تلجرام:', {
      userId,
      plan,
      starsAmount,
      paymentId,
      telegramUserId
    });
    
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
    
    // حساب تاريخ انتهاء الاشتراك
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationInDays);
    
    try {
      // التحقق من وجود اشتراك حالي
      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(
          eq(subscriptions.userId, userId)
        );
      
      let subscription;
      
      if (existingSubscription) {
        // تحديث الاشتراك الحالي
        const [updatedSubscription] = await db
          .update(subscriptions)
          .set({
            type: subscriptionType,
            startDate,
            endDate,
            isActive: true,
            paymentMethod: 'telegram_stars',
            amount: starsAmount,
            currency: 'STARS',
            transactionId: paymentId,
            updatedAt: new Date()
          })
          .where(eq(subscriptions.id, existingSubscription.id))
          .returning();
          
        subscription = updatedSubscription;
      } else {
        // إنشاء اشتراك جديد
        const [newSubscription] = await db
          .insert(subscriptions)
          .values({
            userId,
            type: subscriptionType,
            startDate,
            endDate,
            isActive: true,
            paymentMethod: 'telegram_stars',
            amount: starsAmount,
            currency: 'STARS',
            transactionId: paymentId,
            dailySignalLimit: subscriptionType === 'free' ? 3 : 
                             subscriptionType === 'basic' ? 10 : 
                             subscriptionType === 'pro' ? 25 : 
                             50, // vip
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
          
        subscription = newSubscription;
      }
      
      // تحديث مستوى اشتراك المستخدم في جدول المستخدمين
      await db
        .update(users)
        .set({
          subscriptionLevel: subscriptionType,
          subscriptionExpiry: endDate,
        })
        .where(eq(users.id, userId));
      
      // إرسال إشعار للمستخدم
      await db
        .insert(notifications)
        .values({
          userId,
          type: 'account',
          title: 'تم تفعيل الاشتراك',
          message: `تم تفعيل اشتراكك بنجاح (${subscriptionType}) حتى تاريخ ${endDate.toLocaleDateString('ar-SA')}`,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      
      return {
        success: true,
        subscription,
        type: subscriptionType,
        endDate
      };
    } catch (error) {
      console.error('[دفع النجوم] خطأ في معالجة الدفع:', error);
      throw error;
    }
  }
  
  /**
   * التحقق من صحة دفع نجوم تلجرام 
   * (حالياً يعود دائماً بصحة الدفع - يمكن توسيعه لاحقاً للتحقق الفعلي)
   */
  static async verifyPayment(paymentId: string) {
    console.log('[دفع النجوم] التحقق من دفع:', paymentId);
    
    // في الإصدار الحالي نفترض أن جميع المدفوعات صحيحة
    return {
      verified: true,
      paymentId
    };
  }
  
  /**
   * البحث عن مستخدم بواسطة البريد الإلكتروني
   */
  static async findUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
      
    return user;
  }
  
  /**
   * البحث عن مستخدم بواسطة اسم المستخدم
   */
  static async findUserByUsername(username: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
      
    return user;
  }
}