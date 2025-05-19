/**
 * إدارة النسخ الاحتياطي وقاعدة البيانات
 * 
 * ملف الواجهة الرئيسي الذي يربط بين وظائف إدارة قاعدة البيانات وخدمة النسخ الاحتياطي
 * تم فصل المنطق الداخلي إلى ملفات منفصلة لتحسين الصيانة
 */

import { 
  initializeDatabase as initDb,
  checkTableExists,
  runMigrations
} from './db-manager';

import {
  createBackup as createDbBackup,
  startBackupSystem as startBackupSystemService,
  restoreFromBackup as restoreDb,
  restoreSchemaOnly,
  getAvailableBackups
} from './backup-service';

// واجهة النسخ الاحتياطي وقاعدة البيانات - تصدير الوظائف الرئيسية للاستخدام في المشروع

/**
 * التحقق من وجود جدول في قاعدة البيانات
 */
export { checkTableExists };

/**
 * إنشاء نسخة احتياطية من قاعدة البيانات
 */
export function createBackup(): void {
  createDbBackup().catch(err => {
    console.error("[نظام النسخ الاحتياطي] خطأ أثناء إنشاء نسخة احتياطية:", err);
  });
}

/**
 * بدء نظام النسخ الاحتياطي التلقائي
 */
export function startBackupSystem(): void {
  startBackupSystemService(5); // تنفيذ النسخ الاحتياطي كل 5 دقائق
}

/**
 * استعادة قاعدة البيانات من نسخة احتياطية
 */
export async function restoreFromBackup(): Promise<boolean> {
  return restoreDb();
}

/**
 * تنفيذ عمليات ترحيل قاعدة البيانات
 */
export { runMigrations };

/**
 * تهيئة قاعدة البيانات
 */
export async function initializeDatabase(): Promise<boolean> {
  return initDb();
}
