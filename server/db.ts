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

// استيراد المكتبة بنهج آخر
import * as drizzleOrm from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

// إنشاء كائن للاتصال بقاعدة البيانات
const dialect = new PgDialect({});
const session = {
  execute: async (query, params) => {
    const result = await pool.query(query, params);
    return result.rows;
  },
  dialect
};

// إنشاء كائن drizzle
export const db = drizzleOrm.drizzle(session, { schema });

// تنفيذ التهيئة بشكل غير متزامن
initDB().catch(err => {
  console.error('[نظام قاعدة البيانات] خطأ أثناء تهيئة قاعدة البيانات:', err);
});