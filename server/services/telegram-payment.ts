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
      // استخدام خدمة التخزين لمعالجة الدفع بالنجوم
      const subscription = await storage.processStarsPayment(
        userId,
        plan,
        starsAmount,
        paymentId
      );
      
      // تحديث مستوى اشتراك المستخدم
      await storage.updateUserSubscriptionLevel(userId, subscriptionType, endDate);
      
      // إرسال إشعار للمستخدم
      await storage.createNotification({
        userId,
        type: 'account',
        title: 'تم تفعيل الاشتراك',
        message: `تم تفعيل اشتراكك بنجاح (${subscriptionType}) حتى تاريخ ${endDate.toLocaleDateString('ar-SA')}`,
        read: false
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