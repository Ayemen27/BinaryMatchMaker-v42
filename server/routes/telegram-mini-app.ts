import express from 'express';
import { db } from '../db';
import { subscriptions, users } from '../db';
import crypto from 'crypto';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// الحصول على التوكن من المتغيرات البيئية
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || '';

// إنشاء جيتواي للتطبيق المصغر
const router = express.Router();

/**
 * التحقق من البيانات المبدئية من تلجرام
 * يضمن أن البيانات المرسلة صالحة وقادمة من خدمة تلجرام الرسمية
 */
function verifyTelegramWebAppData(initData: string): boolean {
  try {
    if (!TELEGRAM_SECRET_TOKEN) {
      console.error('لم يتم تعيين TELEGRAM_SECRET_TOKEN! تخطي التحقق من البيانات للتطوير.');
      return true; // للتطوير فقط - يجب تغييره في الإنتاج
    }

    // تحليل البيانات المبدئية
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // فرز المعلمات بترتيب أبجدي
    const params: [string, string][] = [];
    urlParams.forEach((value, key) => {
      params.push([key, value]);
    });
    params.sort((a, b) => a[0].localeCompare(b[0]));

    // بناء سلسلة البيانات
    const dataCheckString = params.map(([key, value]) => `${key}=${value}`).join('\n');

    // حساب HMAC-SHA-256 باستخدام الكلمة السرية
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_SECRET_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // التحقق من مطابقة الهاش
    return calculatedHash === hash;
  } catch (error) {
    console.error('فشل في التحقق من بيانات الويب التطبيقية:', error);
    return false;
  }
}

/**
 * الحصول على بيانات المستخدم من تلجرام باستخدام الرمز المميز للبوت
 */
async function getUserDataFromTelegram(telegramUserId: number) {
  try {
    if (!BOT_TOKEN) {
      console.error('لم يتم تعيين توكن البوت.');
      return null;
    }

    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChat`,
      { params: { chat_id: telegramUserId } }
    );

    if (response.data.ok) {
      return response.data.result;
    }
    
    console.error('فشل في الحصول على بيانات المستخدم من تلجرام:', response.data);
    return null;
  } catch (error) {
    console.error('فشل في الاتصال بـ API تلجرام:', error);
    return null;
  }
}

/**
 * إنشاء أو تحديث معلومات المستخدم في قاعدة البيانات
 */
async function createOrUpdateUser(telegramUserId: number, telegramUsername?: string, telegramName?: string) {
  try {
    // التحقق من وجود المستخدم
    const existingUser = await db.select().from(users).where(eq(users.telegramId, telegramUserId.toString())).limit(1);

    if (existingUser.length > 0) {
      // تحديث المستخدم الموجود
      await db.update(users)
        .set({
          username: telegramUsername || existingUser[0].username,
          fullName: telegramName || existingUser[0].fullName,
          lastLogin: new Date()
        })
        .where(eq(users.telegramId, telegramUserId.toString()));
      
      return existingUser[0];
    } else {
      // إنشاء مستخدم جديد
      const newUser = {
        telegramId: telegramUserId.toString(),
        username: telegramUsername || `user_${telegramUserId}`,
        fullName: telegramName || `Telegram User ${telegramUserId}`,
        email: `telegram_${telegramUserId}@example.com`, // بريد إلكتروني وهمي للمستخدمين القادمين من تلجرام
        subscriptionLevel: 'free',
        createdAt: new Date(),
        lastLogin: new Date()
      };

      const insertedUser = await db.insert(users).values(newUser).returning();
      return insertedUser[0];
    }
  } catch (error) {
    console.error('فشل في إنشاء أو تحديث المستخدم:', error);
    throw error;
  }
}

/**
 * إجراء الدفع وتحديث الاشتراك
 */
async function processSubscriptionPayment(userId: string, planType: string, paymentId: string, starsAmount: number) {
  try {
    // البحث عن المستخدم
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) {
      throw new Error(`المستخدم غير موجود: ${userId}`);
    }

    // تحويل نوع الخطة إلى مستوى اشتراك
    const subscriptionLevel = planType;
    
    // حساب تاريخ انتهاء الصلاحية بناءً على نوع الخطة
    let expiryDate = new Date();
    switch (planType) {
      case 'weekly':
        expiryDate.setDate(expiryDate.getDate() + 7);
        break;
      case 'monthly':
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        break;
      case 'annual':
      case 'premium':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
      default:
        expiryDate.setMonth(expiryDate.getMonth() + 1); // الافتراضي شهري
    }

    // تحديث اشتراك المستخدم
    await db.update(users)
      .set({
        subscriptionLevel,
        subscriptionExpiryDate: expiryDate
      })
      .where(eq(users.id, userId));

    // تسجيل معلومات الاشتراك
    await db.insert(subscriptions).values({
      userId,
      planType,
      paymentMethod: 'telegram_stars',
      transactionId: paymentId,
      amount: starsAmount,
      currency: 'STARS',
      startDate: new Date(),
      endDate: expiryDate,
      status: 'active',
      createdAt: new Date()
    });

    return {
      success: true,
      subscriptionLevel,
      expiryDate
    };
  } catch (error) {
    console.error('فشل في معالجة عملية دفع الاشتراك:', error);
    throw error;
  }
}

/**
 * مسار API للتعامل مع بيانات المستخدم من التطبيق المصغر
 */
router.post('/telegram-mini-app/user-data', async (req, res) => {
  try {
    const { telegramInitData } = req.body;
    
    // التحقق من بيانات تلجرام
    if (!telegramInitData || !verifyTelegramWebAppData(telegramInitData)) {
      return res.status(401).json({ error: 'بيانات تلجرام غير صالحة' });
    }

    // تحليل معلومات المستخدم من البيانات المبدئية
    const urlParams = new URLSearchParams(telegramInitData);
    const user = JSON.parse(urlParams.get('user') || '{}');
    
    if (!user.id) {
      return res.status(400).json({ error: 'بيانات المستخدم غير كاملة' });
    }

    // الحصول على معلومات إضافية من تلجرام
    const telegramUserData = await getUserDataFromTelegram(user.id);
    
    // إنشاء أو تحديث المستخدم في قاعدة البيانات
    const dbUser = await createOrUpdateUser(
      user.id,
      user.username || telegramUserData?.username,
      `${user.first_name || ''} ${user.last_name || ''}`.trim() || telegramUserData?.first_name
    );

    // إرجاع بيانات المستخدم
    res.json({
      id: dbUser.id,
      telegramId: dbUser.telegramId,
      username: dbUser.username,
      fullName: dbUser.fullName,
      subscriptionLevel: dbUser.subscriptionLevel,
      subscriptionExpiryDate: dbUser.subscriptionExpiryDate
    });
  } catch (error) {
    console.error('خطأ أثناء معالجة بيانات المستخدم:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة بيانات المستخدم' });
  }
});

/**
 * مسار API لمعالجة نتائج الدفع من التطبيق المصغر
 */
router.post('/telegram-mini-app/process-payment', async (req, res) => {
  try {
    const {
      telegramInitData,
      userId,
      planType,
      paymentId,
      starsAmount,
      botPaymentData
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!userId || !planType || !paymentId) {
      return res.status(400).json({ error: 'البيانات المطلوبة غير مكتملة' });
    }

    // معالجة عملية دفع الاشتراك
    const result = await processSubscriptionPayment(
      userId,
      planType,
      paymentId,
      Number(starsAmount) || 0
    );

    // إرجاع نتيجة العملية
    res.json({
      success: true,
      message: 'تم معالجة الدفع بنجاح',
      subscriptionDetails: result
    });
  } catch (error) {
    console.error('خطأ أثناء معالجة الدفع:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ أثناء معالجة الدفع',
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

/**
 * مسار API للتحقق من حالة الدفع
 */
router.post('/telegram-mini-app/verify-payment', async (req, res) => {
  try {
    const { paymentId, userId } = req.body;

    // التحقق من وجود معلومات الدفع المطلوبة
    if (!paymentId || !userId) {
      return res.status(400).json({ error: 'معرف الدفع ومعرف المستخدم مطلوبان' });
    }

    // البحث عن الاشتراك المطابق
    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.transactionId, paymentId))
      .limit(1);

    if (subscription.length === 0) {
      return res.json({
        verified: false,
        message: 'لم يتم العثور على معلومات الدفع'
      });
    }

    // التحقق من تطابق الاشتراك مع المستخدم
    if (subscription[0].userId !== userId) {
      return res.json({
        verified: false,
        message: 'معرف المستخدم غير متطابق مع معلومات الدفع'
      });
    }

    // إرجاع حالة التحقق
    res.json({
      verified: true,
      subscriptionDetails: {
        planType: subscription[0].planType,
        startDate: subscription[0].startDate,
        endDate: subscription[0].endDate,
        status: subscription[0].status
      }
    });
  } catch (error) {
    console.error('خطأ أثناء التحقق من الدفع:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء التحقق من الدفع' });
  }
});

export default router;