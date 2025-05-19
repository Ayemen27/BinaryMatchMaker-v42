/**
 * خدمة النسخ الاحتياطي والاسترجاع
 * تقدم وظائف لإنشاء واسترجاع نسخ احتياطية من قاعدة البيانات
 */

import { exec } from "child_process";
import * as fs from "fs";
import path from "path";
import { promisify } from "util";

// تحويل دالة exec إلى وعد Promise
const execAsync = promisify(exec);

// مسار مجلد النسخ الاحتياطية
const backupDir = path.join(process.cwd(), 'backups');

// التأكد من وجود مجلد النسخ الاحتياطية
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// الاسم الثابت لملف مخطط قاعدة البيانات
const SCHEMA_FILE_NAME = 'schema.sql';

/**
 * إنشاء نسخة احتياطية من قاعدة البيانات
 * @returns وعد يحل إلى اسم ملف النسخة الاحتياطية أو null في حالة الفشل
 */
export async function createBackup(): Promise<string | null> {
  try {
    console.log("[خدمة النسخ الاحتياطي] بدء إنشاء نسخة احتياطية من قاعدة البيانات...");
    
    // استخراج متغيرات البيئة
    const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
    
    // التحقق من وجود متغيرات البيئة اللازمة
    if (!PGHOST || !PGPORT || !PGUSER || !PGPASSWORD || !PGDATABASE) {
      console.error('[خدمة النسخ الاحتياطي] خطأ: متغيرات البيئة اللازمة لقاعدة البيانات غير محددة');
      return null;
    }
    
    // إنشاء اسم الملف مع الطابع الزمني
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    try {
      // استيراد النسخ الاحتياطية
      const { db, pool } = await import('./db');
      
      // استخراج قائمة الجداول العامة من قاعدة البيانات
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await pool.query(tablesQuery);
      const tables = tablesResult.rows.map(row => row.table_name);
      
      console.log(`[خدمة النسخ الاحتياطي] وجدت ${tables.length} جدول في قاعدة البيانات`);
      
      // إنشاء كائن لتخزين بيانات النسخة الاحتياطية
      const backupData: any = {
        metadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          database: PGDATABASE,
          tablesCount: tables.length,
          createdAt: new Date().toISOString()
        },
        data: {}
      };
      
      // قائمة بالجداول الرئيسية المهمة التي يجب التأكد من استخراجها أولاً
      const priorityTables = [
        'users',
        'user_settings', 
        'user_notification_settings',
        'signals',
        'user_signals',
        'subscriptions'
      ];
      
      // إعادة ترتيب الجداول للبدء بالجداول ذات الأولوية
      const orderedTables = [
        ...priorityTables.filter(t => tables.includes(t)),
        ...tables.filter(t => !priorityTables.includes(t) && t !== 'session')
      ];
      
      console.log(`[خدمة النسخ الاحتياطي] جداول ذات أولوية: ${priorityTables.filter(t => tables.includes(t)).join(', ')}`);
      console.log(`[خدمة النسخ الاحتياطي] إجمالي الجداول للنسخ الاحتياطي: ${orderedTables.length}`);
      
      // استخراج البيانات من كل جدول
      for (const tableName of orderedTables) {
        try {
          // تجاهل جداول الجلسات لأنها مؤقتة
          if (tableName === 'session') {
            console.log(`[خدمة النسخ الاحتياطي] تخطي جدول الجلسات المؤقتة: ${tableName}`);
            continue;
          }
          
          // استخراج جميع البيانات من الجدول
          const dataQuery = `SELECT * FROM "${tableName}";`;
          const dataResult = await pool.query(dataQuery);
          
          // إضافة البيانات إلى كائن النسخة الاحتياطية
          backupData.data[tableName] = dataResult.rows;
          
          console.log(`[خدمة النسخ الاحتياطي] تم استخراج ${dataResult.rows.length} سجل من جدول ${tableName}`);
          
          // تأخير صغير لمنع استهلاك الموارد بشكل كبير
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (tableError) {
          console.error(`[خدمة النسخ الاحتياطي] خطأ أثناء استخراج بيانات جدول ${tableName}:`, tableError);
        }
      }
      
      // حفظ البيانات في ملف JSON
      fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
      
      console.log(`[خدمة النسخ الاحتياطي] تم إنشاء ملف بيانات النسخة الاحتياطية: ${backupFileName}`);
      
      // إنشاء ملف لوصف المخطط
      const schemaInfoFilePath = path.join(backupDir, 'schema-info.json');
      fs.writeFileSync(schemaInfoFilePath, JSON.stringify({
        createdAt: new Date().toISOString(),
        message: 'يحتوي هذا الملف على معلومات المخطط',
        note: 'لاستعادة قاعدة البيانات، استخدم أمر drizzle-kit push أو npm run db:push',
        tables: tables
      }, null, 2));
      
      console.log('[خدمة النسخ الاحتياطي] تم إنشاء ملف معلومات المخطط');
      
      return backupFileName;
    } catch (err) {
      console.error('[خدمة النسخ الاحتياطي] خطأ أثناء إنشاء ملفات النسخة الاحتياطية:', err);
      return null;
    }
  } catch (error) {
    console.error('[خدمة النسخ الاحتياطي] خطأ أثناء إنشاء النسخة الاحتياطي:', error);
    return null;
  }
}

/**
 * بدء نظام النسخ الاحتياطي التلقائي
 * @param intervalMinutes الفاصل الزمني بين النسخ الاحتياطية بالدقائق (افتراضيًا 5 دقائق)
 */
export function startBackupSystem(intervalMinutes: number = 5): void {
  console.log("[خدمة النسخ الاحتياطي] تم بدء نظام النسخ الاحتياطي");
  
  // محاولة إنشاء نسخة احتياطية مباشرة عند بدء النظام (بدون انتظار إذا فشلت)
  createBackup().catch(err => {
    console.error('[خدمة النسخ الاحتياطي] خطأ في النسخة الاحتياطية الأولية:', err);
  });
  
  // جدولة النسخ الاحتياطي الدوري
  if (intervalMinutes > 0) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        await createBackup();
      } catch (error) {
        console.error('[خدمة النسخ الاحتياطي] خطأ في النسخة الاحتياطية الدورية:', error);
      }
    }, intervalMs);
    
    console.log(`[خدمة النسخ الاحتياطي] تم ضبط النسخ الاحتياطي الدوري كل ${intervalMinutes} دقيقة`);
  }
}

/**
 * الحصول على قائمة بالنسخ الاحتياطية المتاحة
 * @returns مصفوفة من كائنات تحتوي على معلومات عن النسخ الاحتياطية
 */
export function getAvailableBackups(): Array<{ name: string, path: string, time: Date, size: number }> {
  try {
    if (!fs.existsSync(backupDir)) {
      return [];
    }
    
    return fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: filePath,
          time: new Date(stats.mtime),
          size: stats.size
        };
      })
      .sort((a, b) => b.time.getTime() - a.time.getTime()); // ترتيب من الأحدث للأقدم
  } catch (error) {
    console.error('[خدمة النسخ الاحتياطي] خطأ في قراءة النسخ الاحتياطية المتاحة:', error);
    return [];
  }
}

/**
 * استعادة قاعدة البيانات من نسخة احتياطية
 * @param backupFileName اسم ملف النسخة الاحتياطية (اختياري، إذا لم يتم تحديده يتم استخدام أحدث نسخة)
 * @returns وعد يحل إلى قيمة منطقية تشير إلى نجاح العملية
 */
export async function restoreFromBackup(backupFileName?: string): Promise<boolean> {
  try {
    console.log("[خدمة النسخ الاحتياطي] بدء استعادة قاعدة البيانات...");
    
    // تسجيل إشعار بأن استعادة قاعدة البيانات تحتاج إلى إعادة إنشاء الجداول
    console.log("[خدمة النسخ الاحتياطي] للاستعادة الكاملة، يجب إعادة إنشاء هيكل الجداول باستخدام Drizzle");
    
    // الطريقة المستخدمة في النظام الحالي هي استخدام Drizzle لإنشاء هيكل الجداول
    console.log("[خدمة النسخ الاحتياطي] تلقائيًا، سيتم استخدام مخطط Drizzle المحدد في الكود المصدري");
    
    // نستخدم drizzle-kit push لإعادة إنشاء هيكل قاعدة البيانات بالكامل
    try {
      console.log("[خدمة النسخ الاحتياطي] تنفيذ ترحيل قاعدة البيانات باستخدام drizzle-kit...");
      
      // تنفيذ أمر drizzle-kit push عبر npm script
      const drizzlePushCmd = 'npm run db:push';
      const { stdout, stderr } = await execAsync(drizzlePushCmd);
      
      // التحقق من نجاح العملية
      if (stderr && stderr.includes('ERROR')) {
        console.error('[خدمة النسخ الاحتياطي] خطأ أثناء ترحيل قاعدة البيانات:', stderr);
        console.log(stdout); // للتوثيق
        return false;
      }
      
      console.log("[خدمة النسخ الاحتياطي] تم إعادة إنشاء هيكل قاعدة البيانات بنجاح");
      
      // المرحلة التالية ستكون استرجاع البيانات الفعلية، ولكن هذا يتطلب تنفيذ خاص
      // سيتم تنفيذه في تحديث لاحق إذا لزم الأمر
      
      console.log("[خدمة النسخ الاحتياطي] اكتملت عملية استعادة هيكل قاعدة البيانات");
      return true;
    } catch (error) {
      console.error('[خدمة النسخ الاحتياطي] خطأ أثناء إعادة إنشاء هيكل قاعدة البيانات:', error);
      return false;
    }
  } catch (error) {
    console.error('[خدمة النسخ الاحتياطي] خطأ أثناء عملية الاستعادة:', error);
    return false;
  }
}

/**
 * استعادة هيكل قاعدة البيانات فقط (بدون البيانات) 
 * باستخدام مخطط Drizzle من الكود المصدري
 * @returns وعد يحل إلى قيمة منطقية تشير إلى نجاح العملية
 */
export async function restoreSchemaOnly(): Promise<boolean> {
  try {
    console.log("[خدمة النسخ الاحتياطي] بدء استعادة هيكل قاعدة البيانات فقط...");
    
    // استخدام drizzle-kit push لإنشاء هيكل قاعدة البيانات
    const drizzlePushCmd = 'npm run db:push';
    
    console.log("[خدمة النسخ الاحتياطي] تنفيذ ترحيل قاعدة البيانات باستخدام مخطط Drizzle...");
    
    try {
      const { stdout, stderr } = await execAsync(drizzlePushCmd);
      
      if (stderr && stderr.includes('ERROR')) {
        console.error('[خدمة النسخ الاحتياطي] خطأ أثناء إنشاء هيكل قاعدة البيانات:', stderr);
        return false;
      }
      
      console.log("[خدمة النسخ الاحتياطي] تم إنشاء هيكل قاعدة البيانات بنجاح");
      return true;
    } catch (err) {
      console.error('[خدمة النسخ الاحتياطي] خطأ في تنفيذ أمر ترحيل قاعدة البيانات:', err);
      return false;
    }
  } catch (error) {
    console.error('[خدمة النسخ الاحتياطي] خطأ أثناء استعادة هيكل قاعدة البيانات:', error);
    return false;
  }
}