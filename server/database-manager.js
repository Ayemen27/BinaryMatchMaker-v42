const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// تكوين النظام
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 دقائق بالميلي ثانية
const MAX_BACKUPS = 10; // الحد الأقصى لعدد النسخ الاحتياطية للاحتفاظ بها
const backupDir = path.join(__dirname, '../backups');

// إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجودًا
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// الحصول على بيانات الاتصال بقاعدة البيانات
function getDatabaseConfig() {
  const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,
    DATABASE_URL
  } = process.env;

  if (!PGDATABASE && !DATABASE_URL) {
    console.error('[مدير قاعدة البيانات] خطأ: لم يتم العثور على متغيرات البيئة اللازمة لقاعدة البيانات!');
    return null;
  }

  return {
    host: PGHOST,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    connectionString: DATABASE_URL
  };
}

/**
 * دالة للتحقق من وجود قاعدة البيانات وإمكانية الاتصال بها
 * @returns {Promise<boolean>} نتيجة الاتصال - true إذا كان الاتصال ناجحاً, false إذا فشل
 */
async function checkDatabaseConnection() {
  const dbConfig = getDatabaseConfig();
  
  if (!dbConfig) return false;
  
  const { host, port, user, password, database } = dbConfig;

  return new Promise((resolve) => {
    const testQuery = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -c "SELECT 1" -t`;
    
    exec(testQuery, (error, stdout, stderr) => {
      if (error) {
        console.error(`[مدير قاعدة البيانات] خطأ أثناء الاتصال بقاعدة البيانات: ${error.message}`);
        resolve(false);
        return;
      }
      
      resolve(true);
    });
  });
}

/**
 * دالة للتحقق من وجود الجداول في قاعدة البيانات
 * @param {string} tableName اسم الجدول للتحقق منه
 * @returns {Promise<boolean>} نتيجة التحقق - true إذا كان الجدول موجوداً, false إذا لم يكن موجوداً
 */
async function checkTableExists(tableName) {
  const dbConfig = getDatabaseConfig();
  
  if (!dbConfig) return false;
  
  const { host, port, user, password, database } = dbConfig;

  return new Promise((resolve) => {
    const query = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}');" -t`;
    
    exec(query, (error, stdout, stderr) => {
      if (error) {
        console.error(`[مدير قاعدة البيانات] خطأ أثناء التحقق من وجود الجدول ${tableName}: ${error.message}`);
        resolve(false);
        return;
      }
      
      const exists = stdout.trim() === 't';
      resolve(exists);
    });
  });
}

/**
 * دالة لإنشاء نسخة احتياطية من قاعدة البيانات
 * @returns {Promise<string|null>} مسار ملف النسخة الاحتياطية أو null في حالة الفشل
 */
async function createBackup() {
  const dbConfig = getDatabaseConfig();
  
  if (!dbConfig) return null;
  
  const { host, port, user, password, database } = dbConfig;

  // إنشاء اسم ملف النسخة الاحتياطية مع التاريخ والوقت
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  // إنشاء أمر النسخ الاحتياطي
  const pg_dump_cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${backupFile}"`;

  console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] بدء عملية النسخ الاحتياطي...`);

  return new Promise((resolve) => {
    exec(pg_dump_cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء النسخ الاحتياطي: ${error.message}`);
        resolve(null);
        return;
      }

      console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم إنشاء النسخة الاحتياطية بنجاح: ${backupFile}`);

      // أيضًا إنشاء ملف SQL منفصل يحتوي فقط على هيكل قاعدة البيانات (بدون البيانات)
      const schemaFile = path.join(backupDir, 'schema.sql');
      const pg_dump_schema_cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} --schema-only -F p -f "${schemaFile}"`;

      exec(pg_dump_schema_cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء استخراج هيكل قاعدة البيانات: ${error.message}`);
        } else {
          console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم تحديث ملف هيكل قاعدة البيانات بنجاح`);
        }
      });

      // حذف النسخ الاحتياطية القديمة إذا تجاوز العدد الحد الأقصى
      cleanupOldBackups();
      
      resolve(backupFile);
    });
  });
}

/**
 * دالة لاسترجاع البنية الأساسية لقاعدة البيانات من ملف التصميم
 * @returns {Promise<boolean>} نتيجة العملية - true إذا كانت ناجحة, false إذا فشلت
 */
async function restoreSchema() {
  const dbConfig = getDatabaseConfig();
  
  if (!dbConfig) return false;
  
  const { host, port, user, password, database } = dbConfig;
  const schemaFile = path.join(backupDir, 'schema.sql');

  // التحقق من وجود ملف البنية
  if (fs.existsSync(schemaFile)) {
    console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] استرجاع بنية قاعدة البيانات من ملف: ${schemaFile}`);
    
    // إنشاء أمر استعادة قاعدة البيانات
    const psql_cmd = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${schemaFile}"`;
    
    // تنفيذ الأمر
    return new Promise((resolve) => {
      exec(psql_cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء استرجاع بنية قاعدة البيانات: ${error.message}`);
          resolve(false);
          return;
        }
        
        console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم استرجاع بنية قاعدة البيانات بنجاح!`);
        resolve(true);
      });
    });
  } else {
    console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] ملف بنية قاعدة البيانات غير موجود. سيتم إنشاء قاعدة البيانات باستخدام Drizzle.`);
    // سنستخدم Drizzle لإنشاء الجداول
    return runDrizzleMigrations();
  }
}

/**
 * دالة لاسترجاع نسخة احتياطية محددة
 * @param {string} backupFilePath مسار ملف النسخة الاحتياطية
 * @returns {Promise<boolean>} نتيجة العملية - true إذا كانت ناجحة, false إذا فشلت
 */
async function restoreBackup(backupFilePath) {
  const dbConfig = getDatabaseConfig();
  
  if (!dbConfig) return false;
  
  const { host, port, user, password, database } = dbConfig;

  // التحقق من وجود ملف النسخة الاحتياطية
  if (!fs.existsSync(backupFilePath)) {
    console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ: ملف النسخة الاحتياطية ${backupFilePath} غير موجود!`);
    return false;
  }

  console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] استرجاع قاعدة البيانات من النسخة الاحتياطية: ${backupFilePath}`);

  // إنشاء أمر استعادة قاعدة البيانات
  const psql_cmd = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${backupFilePath}"`;

  // تنفيذ الأمر
  return new Promise((resolve) => {
    exec(psql_cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء استرجاع قاعدة البيانات: ${error.message}`);
        resolve(false);
        return;
      }
      
      console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم استرجاع قاعدة البيانات بنجاح!`);
      resolve(true);
    });
  });
}

/**
 * دالة لاسترجاع آخر نسخة احتياطية كاملة
 * @returns {Promise<boolean>} نتيجة العملية - true إذا كانت ناجحة, false إذا فشلت
 */
async function restoreLatestBackup() {
  // التحقق من وجود مجلد النسخ الاحتياطية
  if (!fs.existsSync(backupDir)) {
    console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] مجلد النسخ الاحتياطية غير موجود.`);
    return false;
  }

  // البحث عن أحدث ملف نسخة احتياطية
  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

  if (files.length === 0) {
    console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] لم يتم العثور على ملفات نسخ احتياطية.`);
    return false;
  }

  const latestBackup = files[0];
  return restoreBackup(latestBackup.path);
}

/**
 * دالة لحذف النسخ الاحتياطية القديمة للحفاظ على عدد محدد فقط
 */
function cleanupOldBackups() {
  fs.readdir(backupDir, (err, files) => {
    if (err) {
      console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء قراءة مجلد النسخ الاحتياطية: ${err.message}`);
      return;
    }

    // حصر ملفات النسخ الاحتياطية فقط (بدون ملف schema.sql)
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

    // حذف النسخ القديمة إذا تجاوز العدد الحد الأقصى
    if (backupFiles.length > MAX_BACKUPS) {
      const filesToDelete = backupFiles.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) {
            console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء حذف نسخة احتياطية قديمة (${file.name}): ${err.message}`);
          } else {
            console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم حذف نسخة احتياطية قديمة: ${file.name}`);
          }
        });
      });
    }
  });
}

/**
 * دالة لتشغيل أوامر الهجرة الخاصة بـ Drizzle
 * @returns {Promise<boolean>} نتيجة العملية - true إذا كانت ناجحة, false إذا فشلت
 */
async function runDrizzleMigrations() {
  console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تشغيل أوامر الهجرة الخاصة بـ Drizzle...`);
  
  return new Promise((resolve) => {
    exec('npm run db:push', (error, stdout, stderr) => {
      if (error) {
        console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] خطأ أثناء تنفيذ أوامر الهجرة: ${error.message}`);
        resolve(false);
        return;
      }
      
      console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم تنفيذ أوامر الهجرة بنجاح!`);
      console.log(stdout);
      resolve(true);
    });
  });
}

/**
 * بدء نظام النسخ الاحتياطي الدوري
 */
function startAutoBackup() {
  console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] بدء نظام النسخ الاحتياطي التلقائي (كل ${BACKUP_INTERVAL/1000/60} دقائق)`);
  
  // إنشاء نسخة احتياطية أولية
  createBackup();
  
  // بدء النسخ الاحتياطي بشكل دوري
  setInterval(createBackup, BACKUP_INTERVAL);
}

/**
 * الدالة الرئيسية للتهيئة والتحقق من قاعدة البيانات واسترجاعها إذا لزم الأمر
 */
async function initializeDatabase() {
  console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] بدء تهيئة نظام قاعدة البيانات...`);
  
  try {
    // التحقق من إمكانية الاتصال بقاعدة البيانات
    const isConnected = await checkDatabaseConnection();
    
    if (!isConnected) {
      console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] فشل الاتصال بقاعدة البيانات. تأكد من تكوين متغيرات البيئة بشكل صحيح.`);
      return false;
    }
    
    console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] تم الاتصال بقاعدة البيانات بنجاح.`);
    
    // التحقق من وجود الجداول الأساسية
    const usersTableExists = await checkTableExists('users');
    const signalsTableExists = await checkTableExists('signals');
    
    if (usersTableExists && signalsTableExists) {
      console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] جداول قاعدة البيانات موجودة بالفعل. لا حاجة للاسترجاع.`);
      return true;
    } else {
      console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] بعض جداول قاعدة البيانات غير موجودة. بدء عملية الاسترجاع...`);
      
      try {
        // محاولة استرجاع آخر نسخة احتياطية كاملة
        const backupRestored = await restoreLatestBackup();
        
        if (!backupRestored) {
          // إذا لم يتم استرجاع النسخة الاحتياطية، استرجع البنية فقط
          await restoreSchema();
        }
        
        return true;
      } catch (error) {
        console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] حدث خطأ أثناء عملية الاسترجاع: ${error.message}`);
        console.log(`[مدير قاعدة البيانات] [${new Date().toISOString()}] محاولة إنشاء البنية باستخدام Drizzle...`);
        return await runDrizzleMigrations();
      }
    }
  } catch (error) {
    console.error(`[مدير قاعدة البيانات] [${new Date().toISOString()}] حدث خطأ غير متوقع: ${error.message}`);
    return false;
  }
}

// تصدير الدوال العامة
module.exports = {
  initializeDatabase,
  startAutoBackup,
  createBackup,
  restoreLatestBackup,
  restoreBackup,
  restoreSchema,
  checkDatabaseConnection,
  checkTableExists,
  runDrizzleMigrations
};