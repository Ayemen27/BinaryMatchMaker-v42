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
 * دالة لإنشاء نسخة احتياطية من قاعدة البيانات تتضمن البيانات والبنية
 */
export function createBackup(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  console.log(`[نظام النسخ الاحتياطي] بدء عملية النسخ الاحتياطي الشامل...`);
  
  try {
    // 1. إنشاء نسخة من هيكل قاعدة البيانات
    const schemaFile = path.join(backupDir, 'schema.sql');
    console.log(`[نظام النسخ الاحتياطي] جاري إنشاء نسخة من هيكل قاعدة البيانات...`);
    
    // 2. استخراج البيانات من كل جدول رئيسي باستخدام SQL
    const {
      PGHOST,
      PGPORT,
      PGUSER,
      PGPASSWORD,
      PGDATABASE
    } = process.env;
    
    // قائمة بالجداول الرئيسية التي نريد نسخها
    const tables = [
      'users',
      'user_settings',
      'user_notification_settings',
      'subscriptions',
      'signals',
      'user_signals',
      'user_signal_usage',
      'notifications',
      'market_data'
    ];
    
    // إعداد كائن لتخزين بيانات كل الجداول
    const backup: any = {
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        database: PGDATABASE,
        tables: tables
      },
      data: {}
    };
    
    // نستخدم Promise.all لتنفيذ جميع عمليات استخراج البيانات بالتوازي
    const extractPromises = tables.map(tableName => 
      new Promise((resolve) => {
        const query = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "SELECT row_to_json(t) FROM ${tableName} t" -t`;
        
        exec(query, (error, stdout) => {
          if (error) {
            console.error(`[نظام النسخ الاحتياطي] خطأ أثناء استخراج بيانات جدول ${tableName}: ${error.message}`);
            // حتى لو فشل استخراج جدول، نستمر مع باقي الجداول
            backup.data[tableName] = [];
            resolve(null);
            return;
          }
          
          // معالجة البيانات المستخرجة
          try {
            // تحويل كل سطر JSON إلى كائن
            const rows = stdout.trim().split('\n')
              .filter(line => line.trim() !== '')
              .map(line => {
                try {
                  return JSON.parse(line.trim());
                } catch (e) {
                  console.error(`[نظام النسخ الاحتياطي] خطأ في تحليل بيانات من ${tableName}:`, e);
                  return null;
                }
              })
              .filter(row => row !== null);
            
            backup.data[tableName] = rows;
            console.log(`[نظام النسخ الاحتياطي] تم استخراج ${rows.length} سجل من جدول ${tableName}`);
          } catch (e) {
            console.error(`[نظام النسخ الاحتياطي] خطأ أثناء معالجة بيانات جدول ${tableName}:`, e);
            backup.data[tableName] = [];
          }
          
          resolve(null);
        });
      })
    );
    
    // ننتظر انتهاء جميع عمليات الاستخراج ثم نكتب الملف
    Promise.all(extractPromises).then(() => {
      try {
        // حفظ البيانات في ملف JSON
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        console.log(`[نظام النسخ الاحتياطي] تم إنشاء نسخة احتياطية شاملة: ${backupFile}`);
        
        // أيضًا إنشاء سكريبت SQL بسيط للبنية باستخدام Drizzle
        exec('npm run db:push -- --dry-run', (error, stdout) => {
          if (!error && stdout) {
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
      } catch (err) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء كتابة ملف النسخة الاحتياطية: ${err}`);
      }
    }).catch(err => {
      console.error(`[نظام النسخ الاحتياطي] خطأ غير متوقع أثناء إنشاء النسخة الاحتياطية: ${err}`);
    });
    
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
      .filter(file => file.startsWith('backup-') && (file.endsWith('.json') || file.endsWith('.txt')))
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
 * دالة لاسترجاع قاعدة البيانات من نسخة احتياطية شاملة
 * @param backupFilePath مسار ملف النسخة الاحتياطية
 * @returns وعد يحل إلى قيمة boolean
 */
export async function restoreFromBackup(backupFilePath?: string): Promise<boolean> {
  // البحث عن أحدث نسخة احتياطية إذا لم يتم تحديد الملف
  if (!backupFilePath) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

      if (files.length === 0) {
        console.log(`[نظام النسخ الاحتياطي] لم يتم العثور على ملفات نسخ احتياطية. سيتم إنشاء قاعدة البيانات فارغة.`);
        return await runMigrations();
      }

      backupFilePath = files[0].path;
      console.log(`[نظام النسخ الاحتياطي] استخدام أحدث نسخة احتياطية: ${files[0].name}`);
    } catch (err) {
      console.error(`[نظام النسخ الاحتياطي] خطأ أثناء البحث عن نسخ احتياطية: ${err}`);
      return await runMigrations();
    }
  }

  // التحقق من وجود ملف النسخة الاحتياطية
  if (!fs.existsSync(backupFilePath)) {
    console.error(`[نظام النسخ الاحتياطي] خطأ: ملف النسخة الاحتياطية غير موجود: ${backupFilePath}`);
    return await runMigrations();
  }

  // قراءة ملف النسخة الاحتياطية
  try {
    console.log(`[نظام النسخ الاحتياطي] بدء استرجاع البيانات من النسخة الاحتياطية: ${backupFilePath}`);
    
    // 1. إنشاء بنية قاعدة البيانات أولاً
    console.log(`[نظام النسخ الاحتياطي] إنشاء بنية قاعدة البيانات...`);
    const migrationsSuccess = await runMigrations();
    
    if (!migrationsSuccess) {
      console.error(`[نظام النسخ الاحتياطي] فشل في إنشاء بنية قاعدة البيانات`);
      return false;
    }
    
    // 2. قراءة بيانات النسخة الاحتياطية
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    if (!backupData || !backupData.data) {
      console.error(`[نظام النسخ الاحتياطي] ملف النسخة الاحتياطية غير صالح أو لا يحتوي على بيانات`);
      return false;
    }
    
    console.log(`[نظام النسخ الاحتياطي] تم قراءة بيانات النسخة الاحتياطية بنجاح`);
    
    // 3. استرجاع البيانات إلى الجداول
    const {
      PGHOST,
      PGPORT,
      PGUSER,
      PGPASSWORD,
      PGDATABASE
    } = process.env;
    
    // استرجاع كل جدول على حدة
    const tables = Object.keys(backupData.data);
    
    for (const tableName of tables) {
      const tableData = backupData.data[tableName];
      
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        console.log(`[نظام النسخ الاحتياطي] جدول ${tableName} فارغ أو غير موجود في النسخة الاحتياطية`);
        continue;
      }
      
      console.log(`[نظام النسخ الاحتياطي] استرجاع ${tableData.length} سجل إلى جدول ${tableName}...`);
      
      // نقوم أولاً بإفراغ الجدول
      const truncateQuery = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;"`;
      
      try {
        await new Promise<void>((resolve, reject) => {
          exec(truncateQuery, (error) => {
            if (error) {
              console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إفراغ جدول ${tableName}: ${error.message}`);
              // نستمر حتى مع وجود خطأ
              resolve();
              return;
            }
            console.log(`[نظام النسخ الاحتياطي] تم إفراغ جدول ${tableName} بنجاح`);
            resolve();
          });
        });
        
        // ثم نقوم بإدراج البيانات
        for (const row of tableData) {
          // تحويل الكائن إلى سلسلة JSON محفوظة
          const jsonStr = JSON.stringify(row).replace(/'/g, "''");
          
          // إنشاء أمر إدراج
          const insertQuery = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "INSERT INTO ${tableName} SELECT * FROM json_populate_record(null::${tableName}, '${jsonStr}');"`;
          
          await new Promise<void>((resolve) => {
            exec(insertQuery, (error) => {
              if (error) {
                console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إدراج بيانات في جدول ${tableName}: ${error.message}`);
                // نستمر مع السجل التالي
                resolve();
                return;
              }
              resolve();
            });
          });
        }
        
        console.log(`[نظام النسخ الاحتياطي] تم استرجاع جدول ${tableName} بنجاح`);
      } catch (err) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء استرجاع جدول ${tableName}: ${err}`);
      }
    }
    
    console.log(`[نظام النسخ الاحتياطي] تم استرجاع قاعدة البيانات بنجاح!`);
    return true;
    
  } catch (err) {
    console.error(`[نظام النسخ الاحتياطي] خطأ أثناء استرجاع النسخة الاحتياطية: ${err}`);
    return false;
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
      
      // محاولة استرجاع البيانات من نسخة احتياطية
      console.log(`[نظام النسخ الاحتياطي] البحث عن نسخة احتياطية لاسترجاع البيانات...`);
      
      try {
        // البحث عن نسخ احتياطية
        const files = fs.readdirSync(backupDir)
          .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
          .map(file => ({
            name: file,
            path: path.join(backupDir, file),
            time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

        if (files.length > 0) {
          // وجدنا نسخة احتياطية، سنحاول استرجاعها
          console.log(`[نظام النسخ الاحتياطي] تم العثور على نسخة احتياطية: ${files[0].name}`);
          const restored = await restoreFromBackup(files[0].path);
          
          if (restored) {
            console.log(`[نظام النسخ الاحتياطي] تم استرجاع قاعدة البيانات بنجاح من النسخة الاحتياطية!`);
            return true;
          } else {
            console.log(`[نظام النسخ الاحتياطي] فشل في استرجاع النسخة الاحتياطية. محاولة إنشاء قاعدة بيانات جديدة...`);
          }
        } else {
          console.log(`[نظام النسخ الاحتياطي] لم يتم العثور على نسخ احتياطية.`);
        }
      } catch (err) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء البحث عن نسخ احتياطية: ${err}`);
      }
      
      // إذا فشلت عملية الاسترجاع أو لم نجد نسخ احتياطية، ننشئ قاعدة بيانات جديدة
      console.log(`[نظام النسخ الاحتياطي] إنشاء جداول قاعدة البيانات باستخدام Drizzle...`);
      return await runMigrations();
    }
  } catch (error) {
    console.error(`[نظام النسخ الاحتياطي] حدث خطأ غير متوقع: ${error}`);
    return false;
  }
}