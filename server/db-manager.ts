/**
 * مدير قاعدة البيانات
 * مسؤول عن تهيئة والتحقق من حالة قاعدة البيانات
 */

import { db, pool } from "./db";
import { exec } from "child_process";
import { promisify } from "util";
import { storage } from "./storage";

// تحويل دالة exec إلى وعد Promise
const execAsync = promisify(exec);

/**
 * التحقق من وجود جدول معين في قاعدة البيانات
 * @param tableName اسم الجدول
 * @returns وعد يحل إلى قيمة منطقية تشير إلى وجود الجدول
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const query = {
      text: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists;
      `,
      values: [tableName]
    };
    
    const result = await pool.query(query);
    
    // التحقق من النتيجة بشكل آمن
    return result.rows.length > 0 ? result.rows[0].exists : false;
  } catch (error) {
    console.error(`[مدير قاعدة البيانات] خطأ أثناء التحقق من وجود الجدول ${tableName}:`, error);
    return false;
  }
}

/**
 * تنفيذ عمليات ترحيل قاعدة البيانات
 * ينشئ جداول قاعدة البيانات من مخطط الكود المصدري
 */
export async function runMigrations(): Promise<boolean> {
  try {
    console.log("[مدير قاعدة البيانات] بدء عملية ترحيل قاعدة البيانات...");
    
    // استخدام أمر drizzle-kit push عبر npm script
    const drizzlePushCmd = 'npm run db:push';
    const { stdout, stderr } = await execAsync(drizzlePushCmd);
    
    if (stderr && !stderr.includes('No migration')) {
      console.error("[مدير قاعدة البيانات] خطأ في ترحيل قاعدة البيانات:", stderr);
      return false;
    }
    
    console.log("[مدير قاعدة البيانات] تم ترحيل قاعدة البيانات بنجاح");
    return true;
  } catch (error) {
    console.error("[مدير قاعدة البيانات] خطأ في ترحيل قاعدة البيانات:", error);
    return false;
  }
}

/**
 * تهيئة قاعدة البيانات
 * تتحقق من وجود جداول في قاعدة البيانات وتنشئها إذا لم تكن موجودة
 */
/**
 * إنشاء بيانات المستخدم الافتراضي
 * يتم استدعاؤها بعد التأكد من وجود جميع الجداول في قاعدة البيانات
 */
export async function createDefaultUser(): Promise<boolean> {
  try {
    // التحقق من وجود مستخدمين
    const existingUsers = await pool.query('SELECT * FROM users LIMIT 1');
    
    if (existingUsers.rows.length === 0) {
      console.log("[مدير قاعدة البيانات] عدم وجود مستخدمين، إنشاء المستخدم الافتراضي...");
      
      // إنشاء كلمة مرور للمستخدم الافتراضي - مشفرة مسبقًا لكلمة المرور "Ay**--772293228"
      const hashedPassword = "e051a0d56106a5927530411e9b3385f99397cdbcd470a5e789825c6453e3675df873dd5cfee1d617f2ca05bc64f758ed6e24c735235cd288d28df39172f803bf.3ca8193a4531de57f89d226f3634a57f";
      
      // إنشاء المستخدم الافتراضي
      const userInsertQuery = `
        INSERT INTO users (username, password, language, created_at, is_active) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id
      `;
      const userResult = await pool.query(userInsertQuery, [
        "Binarjoinanalytic", 
        hashedPassword, 
        "ar", 
        new Date(), 
        true
      ]);
      
      const userId = userResult.rows[0].id;
      console.log(`[مدير قاعدة البيانات] تم إنشاء المستخدم الافتراضي بنجاح مع المعرف: ${userId}`);
      
      // إنشاء إعدادات المستخدم
      const settingsInsertQuery = `
        INSERT INTO user_settings (
          user_id, theme, default_asset, default_timeframe, chart_type, 
          show_trading_tips, auto_refresh_data, refresh_interval, use_ai_for_signals, 
          created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      await pool.query(settingsInsertQuery, [
        userId, "dark", "BTC/USDT", "1h", "candlestick", 
        true, true, 60, true, 
        new Date(), new Date()
      ]);
      console.log("[مدير قاعدة البيانات] تم إنشاء إعدادات المستخدم بنجاح");
      
      // إنشاء إعدادات إشعارات المستخدم
      const notifSettingsInsertQuery = `
        INSERT INTO user_notification_settings (
          user_id, email_notifications, push_notifications, signal_alerts, 
          market_updates, account_alerts, promotional_emails, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      await pool.query(notifSettingsInsertQuery, [
        userId, true, true, true, true, true, false, new Date(), new Date()
      ]);
      console.log("[مدير قاعدة البيانات] تم إنشاء إعدادات إشعارات المستخدم بنجاح");
      
      // إنشاء اشتراك للمستخدم
      const subscriptionInsertQuery = `
        INSERT INTO subscriptions (
          user_id, type, start_date, is_active, daily_signal_limit, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await pool.query(subscriptionInsertQuery, [
        userId, "free", new Date(), true, 5, new Date(), new Date()
      ]);
      console.log("[مدير قاعدة البيانات] تم إنشاء اشتراك المستخدم بنجاح");
      
      return true;
    } else {
      console.log("[مدير قاعدة البيانات] تم العثور على مستخدمين موجودين بالفعل، تخطي إنشاء المستخدم الافتراضي");
      return true;
    }
  } catch (error) {
    console.error("[مدير قاعدة البيانات] خطأ أثناء إنشاء المستخدم الافتراضي:", error);
    return false;
  }
}

export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log("[مدير قاعدة البيانات] بدء تهيئة قاعدة البيانات");
    
    // التحقق من وجود جدول رئيسي كمؤشر (جدول Users)
    const usersTableExists = await checkTableExists('users');
    
    if (!usersTableExists) {
      console.log("[مدير قاعدة البيانات] جدول المستخدمين غير موجود، بدء عملية إنشاء الجداول...");
      
      // تنفيذ ترحيل قاعدة البيانات
      const migrationSuccess = await runMigrations();
      
      if (!migrationSuccess) {
        console.error("[مدير قاعدة البيانات] فشل في إنشاء جداول قاعدة البيانات");
        return false;
      }
      
      // التحقق مرة أخرى من وجود الجداول بعد الترحيل
      const tablesCreated = await checkTableExists('users');
      if (tablesCreated) {
        // إنشاء المستخدم الافتراضي بعد التأكد من وجود الجداول
        await createDefaultUser();
      }
    } else {
      console.log("[مدير قاعدة البيانات] جداول قاعدة البيانات موجودة بالفعل");
      
      // تحقق من وجود المستخدم الافتراضي
      await createDefaultUser();
    }
    
    return true;
  } catch (error) {
    console.error("[مدير قاعدة البيانات] خطأ أثناء تهيئة قاعدة البيانات:", error);
    return false;
  }
}