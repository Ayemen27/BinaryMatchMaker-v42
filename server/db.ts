import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { initializeDatabase, startBackupSystem } from './backup-manager';

// التحقق من وجود متغير البيئة DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. تحتاج إلى تعيين رابط قاعدة بيانات Supabase.",
  );
}

console.log('[نظام قاعدة البيانات] محاولة الاتصال بقاعدة بيانات Supabase...');

// تهيئة قاعدة البيانات واسترجاعها إذا لزم الأمر
const initDB = async () => {
  console.log('[نظام قاعدة البيانات] بدء التحقق من قاعدة البيانات وتهيئتها...');
  await initializeDatabase();
  // بدء نظام النسخ الاحتياطي التلقائي
  startBackupSystem();
};

// إنشاء مجمع اتصالات لقاعدة بيانات Supabase
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// استيراد مكتبة درزل
import { drizzle } from 'drizzle-orm/pg-core';

// استخدام مخترع مخصص لـ drizzle مع pg
const customDrizzleAdapter = {
  query: async (query: string, params: any[] = []) => {
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('خطأ في استعلام قاعدة البيانات:', error);
      throw error;
    }
  }
};

// @ts-ignore - ignore TypeScript errors
export const db = drizzle(customDrizzleAdapter, { schema });

// تنفيذ التهيئة بشكل غير متزامن
initDB().catch(err => {
  console.error('[نظام قاعدة البيانات] خطأ أثناء تهيئة قاعدة البيانات:', err);
});