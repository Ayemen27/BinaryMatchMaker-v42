/**
 * إدارة النسخ الاحتياطي وقاعدة البيانات
 * 
 * ملف الواجهة الرئيسي الذي يربط بين وظائف إدارة قاعدة البيانات وخدمة النسخ الاحتياطي
 * تم فصل المنطق الداخلي إلى ملفات منفصلة لتحسين الصيانة
 */

import { 
  checkTableExists,
  runMigrations,
  createDefaultUser
} from './db-manager';

import {
  createBackup as createDbBackup,
  startBackupSystem as startBackupSystemService,
  restoreFromBackup as restoreDb,
  restoreSchemaOnly,
  getAvailableBackups
} from './backup-service';

import { pool } from './db';

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
 * وظيفة مساعدة للتحقق من وجود مستخدمين في قاعدة البيانات
 */
async function checkUsersExist(): Promise<boolean> {
  try {
    // التحقق من وجود جدول المستخدمين
    const tableExists = await checkTableExists('users');
    if (!tableExists) {
      return false;
    }
    
    // التحقق من وجود سجلات في جدول المستخدمين
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('[نظام قاعدة البيانات] خطأ أثناء التحقق من وجود مستخدمين:', error);
    return false;
  }
}

/**
 * تهيئة قاعدة البيانات
 * تقوم بتنفيذ كل خطوات تهيئة قاعدة البيانات:
 * 1. إنشاء الجداول إذا لم تكن موجودة
 * 2. استرجاع البيانات إذا كانت قاعدة البيانات فارغة
 * 3. إنشاء المستخدم الافتراضي إذا لم يكن هناك مستخدمين
 */
export async function initializeDatabase(): Promise<boolean> {
  console.log('[نظام قاعدة البيانات] بدء تهيئة قاعدة البيانات الشاملة...');
  
  try {
    // 1. التأكد من إنشاء هيكل قاعدة البيانات
    let usersTableExists = await checkTableExists('users');
    
    if (!usersTableExists) {
      console.log('[نظام قاعدة البيانات] جدول المستخدمين غير موجود، بدء عملية إنشاء الجداول...');
      
      // تنفيذ ترحيل قاعدة البيانات
      const migrationSuccess = await runMigrations();
      
      if (!migrationSuccess) {
        console.error('[نظام قاعدة البيانات] فشل في إنشاء جداول قاعدة البيانات');
        return false;
      }
      
      console.log('[نظام قاعدة البيانات] تم إنشاء جداول قاعدة البيانات بنجاح');
    } else {
      console.log('[نظام قاعدة البيانات] جداول قاعدة البيانات موجودة بالفعل');
    }
    
    // 2. التحقق مما إذا كان هناك مستخدمين في قاعدة البيانات
    const usersExist = await checkUsersExist();
    
    if (!usersExist) {
      console.log('[نظام قاعدة البيانات] لا يوجد مستخدمين في قاعدة البيانات، البدء في استعادة البيانات...');
      
      // 3. محاولة استرجاع البيانات من نسخة احتياطية إذا كانت متوفرة
      try {
        // الحصول على قائمة النسخ الاحتياطية المتوفرة
        const backups = getAvailableBackups();
        
        if (backups.length > 0) {
          console.log(`[نظام قاعدة البيانات] تم العثور على ${backups.length} نسخة احتياطية، محاولة الاسترجاع...`);
          
          // استرجاع البيانات من أحدث نسخة احتياطية
          const restored = await restoreFromBackup();
          
          if (restored) {
            console.log('[نظام قاعدة البيانات] تم استرجاع البيانات بنجاح من النسخة الاحتياطية');
            
            // التحقق مرة أخرى من وجود مستخدمين بعد الاسترجاع
            const usersRestoredExist = await checkUsersExist();
            
            if (usersRestoredExist) {
              console.log('[نظام قاعدة البيانات] تم العثور على مستخدمين بعد استرجاع البيانات');
              
              // بدء نظام النسخ الاحتياطي
              startBackupSystem();
              
              return true;
            }
          } else {
            console.warn('[نظام قاعدة البيانات] فشل في استرجاع البيانات من النسخة الاحتياطية');
          }
        } else {
          console.log('[نظام قاعدة البيانات] لا توجد نسخ احتياطية متوفرة للاسترجاع');
        }
      } catch (error) {
        console.error('[نظام قاعدة البيانات] خطأ أثناء محاولة استرجاع البيانات:', error);
      }
      
      // 4. إذا لم تنجح عملية الاسترجاع أو لم تكن هناك نسخ احتياطية، نقوم بإنشاء المستخدم الافتراضي
      console.log('[نظام قاعدة البيانات] محاولة إنشاء المستخدم الافتراضي...');
      
      try {
        // استدعاء وظيفة إنشاء المستخدم الافتراضي
        const userCreated = await createDefaultUser();
        
        if (userCreated) {
          console.log('[نظام قاعدة البيانات] تم إنشاء المستخدم الافتراضي بنجاح');
          
          // بدء نظام النسخ الاحتياطي بعد إنشاء المستخدم الافتراضي
          startBackupSystem();
          
          return true;
        } else {
          console.error('[نظام قاعدة البيانات] فشل في إنشاء المستخدم الافتراضي');
          return false;
        }
      } catch (error) {
        console.error('[نظام قاعدة البيانات] خطأ أثناء إنشاء المستخدم الافتراضي:', error);
        return false;
      }
    } else {
      console.log('[نظام قاعدة البيانات] تم العثور على مستخدمين في قاعدة البيانات');
      
      // بدء نظام النسخ الاحتياطي
      startBackupSystem();
      
      return true;
    }
  } catch (error) {
    console.error('[نظام قاعدة البيانات] خطأ أثناء عملية تهيئة قاعدة البيانات الشاملة:', error);
    return false;
  }
}
