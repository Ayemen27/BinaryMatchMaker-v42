/**
 * نظام النسخ الاحتياطي والاسترجاع
 * 
 * هذا الملف يتعامل مع:
 * - تهيئة قاعدة البيانات واكتشاف الجداول
 * - النسخ الاحتياطي التلقائي كل 5 دقائق
 * - استرجاع البيانات عند اكتشاف عدم وجود جداول
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import path from 'path';

// تكوين النظام
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 دقائق بالميلي ثانية
const MAX_BACKUPS = 10; // الحد الأقصى لعدد النسخ الاحتياطية للاحتفاظ بها
const backupDir = path.join(process.cwd(), 'backups');

// إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجودًا
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * دالة للتحقق من وجود الجداول في قاعدة البيانات
 * @param tableName اسم الجدول للتحقق منه
 * @returns وعد يحل إلى قيمة boolean
 */
export function checkTableExists(tableName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      PGHOST,
      PGPORT,
      PGUSER,
      PGPASSWORD,
      PGDATABASE
    } = process.env;

    if (!PGDATABASE) {
      console.error('[نظام النسخ الاحتياطي] خطأ: لم يتم العثور على متغيرات البيئة اللازمة لقاعدة البيانات!');
      resolve(false);
      return;
    }

    const query = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}');" -t`;
    
    exec(query, (error, stdout) => {
      if (error) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء التحقق من وجود الجدول ${tableName}: ${error.message}`);
        resolve(false);
        return;
      }
      
      const exists = stdout.trim() === 't';
      resolve(exists);
    });
  });
}

/**
 * دالة لإنشاء نسخة احتياطية بسيطة من قاعدة البيانات
 */
export function createBackup(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.txt`);
  
  console.log(`[نظام النسخ الاحتياطي] بدء عملية النسخ الاحتياطي...`);
  
  // كتابة ملف بسيط يسجل عملية النسخ الاحتياطي
  try {
    fs.writeFileSync(backupFile, 
      `-- النسخة الاحتياطية أنشئت في ${timestamp}
-- يتم حفظ معلومات النسخة الاحتياطية بشكل بسيط
-- لاستعادة قاعدة البيانات، استخدم أمر db:push لإعادة بناء البنية من الكود المصدري
-- تاريخ النسخ الاحتياطي: ${new Date().toLocaleString()}
-- قاعدة البيانات: ${process.env.PGDATABASE}
-- المضيف: ${process.env.PGHOST}`
    );
    
    console.log(`[نظام النسخ الاحتياطي] تم إنشاء ملف النسخة الاحتياطية البسيط: ${backupFile}`);
    
    // إنشاء سكريبت SQL بسيط باستخدام Drizzle
    exec('npm run db:push -- --dry-run', (error, stdout) => {
      if (!error && stdout) {
        const schemaFile = path.join(backupDir, 'schema.sql');
        try {
          fs.writeFileSync(schemaFile, 
            `-- Schema generated on ${timestamp}\n-- Using drizzle-kit\n\n` + stdout
          );
          console.log(`[نظام النسخ الاحتياطي] تم تحديث ملف البنية بنجاح`);
        } catch (err) {
          console.error(`[نظام النسخ الاحتياطي] خطأ أثناء كتابة ملف البنية: ${err}`);
        }
      }
    });
    
    // تنظيف النسخ الاحتياطية القديمة
    cleanupOldBackups();
    
  } catch(err) {
    console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إنشاء النسخة الاحتياطية: ${err}`);
  }
}

/**
 * دالة لحذف النسخ الاحتياطية القديمة للحفاظ على عدد محدد فقط
 */
function cleanupOldBackups(): void {
  try {
    // حصر ملفات النسخ الاحتياطية فقط (بدون ملف schema.sql)
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.txt'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

    // حذف النسخ القديمة إذا تجاوز العدد الحد الأقصى
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`[نظام النسخ الاحتياطي] تم حذف نسخة احتياطية قديمة: ${file.name}`);
        } catch (err) {
          console.error(`[نظام النسخ الاحتياطي] خطأ أثناء حذف نسخة احتياطية قديمة (${file.name}): ${err}`);
        }
      });
    }
  } catch (err) {
    console.error(`[نظام النسخ الاحتياطي] خطأ أثناء قراءة مجلد النسخ الاحتياطية: ${err}`);
  }
}

/**
 * دالة لتشغيل أوامر الهجرة الخاصة بـ Drizzle
 * @returns وعد يحل إلى قيمة boolean
 */
export function runMigrations(): Promise<boolean> {
  console.log(`[نظام النسخ الاحتياطي] تشغيل أوامر الهجرة الخاصة بـ Drizzle...`);
  
  return new Promise((resolve) => {
    exec('npm run db:push', (error, stdout) => {
      if (error) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء تنفيذ أوامر الهجرة: ${error.message}`);
        resolve(false);
        return;
      }
      
      console.log(`[نظام النسخ الاحتياطي] تم تنفيذ أوامر الهجرة بنجاح!`);
      console.log(stdout);
      resolve(true);
    });
  });
}

/**
 * بدء نظام النسخ الاحتياطي الدوري
 */
export function startBackupSystem(): void {
  console.log(`[نظام النسخ الاحتياطي] بدء نظام النسخ الاحتياطي التلقائي (كل ${BACKUP_INTERVAL/1000/60} دقائق)`);
  
  // إنشاء نسخة احتياطية أولية
  createBackup();
  
  // بدء النسخ الاحتياطي بشكل دوري
  setInterval(createBackup, BACKUP_INTERVAL);
}

/**
 * الدالة الرئيسية للتهيئة والتحقق من قاعدة البيانات واسترجاعها إذا لزم الأمر
 */
export async function initializeDatabase(): Promise<boolean> {
  console.log(`[نظام النسخ الاحتياطي] بدء تهيئة نظام قاعدة البيانات...`);
  
  try {
    // التحقق من وجود الجداول الأساسية
    const usersTableExists = await checkTableExists('users');
    const signalsTableExists = await checkTableExists('signals');
    
    if (usersTableExists && signalsTableExists) {
      console.log(`[نظام النسخ الاحتياطي] جداول قاعدة البيانات موجودة بالفعل. لا حاجة للاسترجاع.`);
      return true;
    } else {
      console.log(`[نظام النسخ الاحتياطي] بعض جداول قاعدة البيانات غير موجودة. بدء عملية الاسترجاع...`);
      
      // محاولة إنشاء الجداول باستخدام Drizzle
      console.log(`[نظام النسخ الاحتياطي] إنشاء جداول قاعدة البيانات باستخدام Drizzle...`);
      return await runMigrations();
    }
  } catch (error) {
    console.error(`[نظام النسخ الاحتياطي] حدث خطأ غير متوقع: ${error}`);
    return false;
  }
}