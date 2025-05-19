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
    
    // إنشاء جداول قاعدة البيانات يدويًا بدلاً من استخدام drizzle-kit
    // التحقق من وجود جدول الـ users
    const usersTableExists = await checkTableExists('users');
    if (!usersTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول المستخدمين...");
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT,
          full_name TEXT,
          subscription_level TEXT NOT NULL DEFAULT 'free',
          subscription_expiry TIMESTAMP,
          language TEXT NOT NULL DEFAULT 'ar',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_login TIMESTAMP,
          avatar TEXT,
          phone_number TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true
        )
      `;
      await pool.query(createUsersTable);
    }

    // التحقق من وجود جدول الـ user_settings
    const userSettingsTableExists = await checkTableExists('user_settings');
    if (!userSettingsTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول إعدادات المستخدم...");
      const createUserSettingsTable = `
        CREATE TABLE IF NOT EXISTS user_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          theme TEXT NOT NULL DEFAULT 'dark',
          default_asset TEXT DEFAULT 'BTC/USDT',
          default_timeframe TEXT DEFAULT '1h',
          default_platform TEXT,
          chart_type TEXT DEFAULT 'candlestick',
          show_trading_tips BOOLEAN DEFAULT true,
          auto_refresh_data BOOLEAN DEFAULT true,
          refresh_interval INTEGER DEFAULT 60,
          use_ai_for_signals BOOLEAN DEFAULT true,
          use_custom_ai_key BOOLEAN DEFAULT false,
          openai_api_key TEXT,
          enable_otc_trading BOOLEAN DEFAULT false,
          allow_scheduled_signals BOOLEAN DEFAULT true,
          respect_timeframes BOOLEAN DEFAULT true,
          last_signal_time TIMESTAMP,
          preferred_platforms TEXT[],
          preferred_pairs TEXT[],
          preferred_timeframes TEXT[],
          signal_history JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `;
      await pool.query(createUserSettingsTable);
    }

    // جدول إعدادات إشعارات المستخدم
    const userNotificationSettingsTableExists = await checkTableExists('user_notification_settings');
    if (!userNotificationSettingsTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول إعدادات إشعارات المستخدم...");
      const createUserNotificationSettingsTable = `
        CREATE TABLE IF NOT EXISTS user_notification_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email_notifications BOOLEAN DEFAULT true,
          push_notifications BOOLEAN DEFAULT true,
          signal_alerts BOOLEAN DEFAULT true,
          market_updates BOOLEAN DEFAULT true,
          account_alerts BOOLEAN DEFAULT true,
          promotional_emails BOOLEAN DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `;
      await pool.query(createUserNotificationSettingsTable);
    }

    // جدول الاشتراكات
    const subscriptionsTableExists = await checkTableExists('subscriptions');
    if (!subscriptionsTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول الاشتراكات...");
      
      // إنشاء نوع التعداد لنوع الاشتراك
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
            CREATE TYPE subscription_type AS ENUM ('free', 'basic', 'pro', 'vip');
          END IF;
        END$$;
      `);
      
      const createSubscriptionsTable = `
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type subscription_type NOT NULL DEFAULT 'free',
          start_date TIMESTAMP NOT NULL DEFAULT NOW(),
          end_date TIMESTAMP,
          is_active BOOLEAN NOT NULL DEFAULT true,
          daily_signal_limit INTEGER DEFAULT 3,
          transaction_id TEXT,
          payment_method TEXT,
          amount INTEGER,
          currency TEXT,
          auto_renew BOOLEAN DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `;
      await pool.query(createSubscriptionsTable);
    }
    
    // جدول الإشارات (signals)
    const signalsTableExists = await checkTableExists('signals');
    if (!signalsTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول الإشارات...");
      
      // إنشاء أنواع التعداد المطلوبة
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_type') THEN
            CREATE TYPE signal_type AS ENUM ('buy', 'sell');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_status') THEN
            CREATE TYPE signal_status AS ENUM ('active', 'completed');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_result') THEN
            CREATE TYPE signal_result AS ENUM ('success', 'failure');
          END IF;
        END$$;
      `);
      
      const createSignalsTable = `
        CREATE TABLE IF NOT EXISTS signals (
          id SERIAL PRIMARY KEY,
          asset TEXT NOT NULL,
          type signal_type NOT NULL,
          entry_price TEXT NOT NULL,
          target_price TEXT NOT NULL,
          stop_loss TEXT NOT NULL,
          accuracy INTEGER NOT NULL,
          time TEXT NOT NULL,
          status signal_status NOT NULL DEFAULT 'active',
          indicators TEXT[] NOT NULL,
          platform TEXT,
          timeframe TEXT,
          analysis JSONB,
          reason TEXT,
          created_by INTEGER,
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP,
          result signal_result
        )
      `;
      await pool.query(createSignalsTable);
    }
    
    // جدول إشارات المستخدم (user_signals)
    const userSignalsTableExists = await checkTableExists('user_signals');
    if (!userSignalsTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول إشارات المستخدم...");
      const createUserSignalsTable = `
        CREATE TABLE IF NOT EXISTS user_signals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          signal_id INTEGER NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
          is_favorite BOOLEAN DEFAULT false,
          is_taken BOOLEAN DEFAULT false,
          notes TEXT,
          result signal_result,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, signal_id)
        )
      `;
      await pool.query(createUserSignalsTable);
    }
    
    // جدول استخدام الإشارات (user_signal_usage)
    const userSignalUsageTableExists = await checkTableExists('user_signal_usage');
    if (!userSignalUsageTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول استخدام الإشارات...");
      const createUserSignalUsageTable = `
        CREATE TABLE IF NOT EXISTS user_signal_usage (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TIMESTAMP NOT NULL DEFAULT NOW(),
          signals_generated INTEGER DEFAULT 0,
          signals_viewed INTEGER DEFAULT 0,
          analysis_requested INTEGER DEFAULT 0
        )
      `;
      await pool.query(createUserSignalUsageTable);
    }
    
    // جدول الإشعارات (notifications)
    const notificationsTableExists = await checkTableExists('notifications');
    if (!notificationsTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول الإشعارات...");
      
      // إنشاء نوع التعداد لنوع الإشعار
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
            CREATE TYPE notification_type AS ENUM ('signal', 'market', 'account', 'system');
          END IF;
        END$$;
      `);
      
      const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type notification_type NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          link TEXT,
          related_id INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;
      await pool.query(createNotificationsTable);
    }
    
    // جدول بيانات السوق (market_data)
    const marketDataTableExists = await checkTableExists('market_data');
    if (!marketDataTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول بيانات السوق...");
      const createMarketDataTable = `
        CREATE TABLE IF NOT EXISTS market_data (
          id SERIAL PRIMARY KEY,
          asset TEXT NOT NULL,
          price TEXT NOT NULL,
          change_24h TEXT,
          high_24h TEXT,
          low_24h TEXT,
          volume_24h TEXT,
          market_cap TEXT,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          data_source TEXT
        )
      `;
      await pool.query(createMarketDataTable);
    }
    
    // جدول جلسات المستخدمين (إذا كان مطلوبًا)
    const sessionTableExists = await checkTableExists('session');
    if (!sessionTableExists) {
      console.log("[مدير قاعدة البيانات] إنشاء جدول جلسات المستخدمين...");
      const createSessionTable = `
        CREATE TABLE IF NOT EXISTS "session" (
          sid VARCHAR NOT NULL,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY (sid)
        )
      `;
      await pool.query(createSessionTable);
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