const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// تكوين النظام
const backupDir = path.join(__dirname, '../backups');
const schemaFile = path.join(backupDir, 'schema.sql');

/**
 * دالة للتحقق من وجود قاعدة البيانات وإمكانية الاتصال بها
 * @returns {Promise<boolean>} نتيجة الاتصال - true إذا كان الاتصال ناجحاً, false إذا فشل
 */
async function checkDatabaseConnection() {
  // استخراج بيانات الاتصال من متغيرات البيئة
  const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE
  } = process.env;

  if (!PGDATABASE) {
    console.error('خطأ: لم يتم العثور على متغيرات البيئة اللازمة لقاعدة البيانات!');
    return false;
  }

  return new Promise((resolve) => {
    const testQuery = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "SELECT 1" -t`;
    
    exec(testQuery, (error, stdout, stderr) => {
      if (error) {
        console.error(`خطأ أثناء الاتصال بقاعدة البيانات: ${error.message}`);
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
  const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE
  } = process.env;

  return new Promise((resolve) => {
    const query = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}');" -t`;
    
    exec(query, (error, stdout, stderr) => {
      if (error) {
        console.error(`خطأ أثناء التحقق من وجود الجدول ${tableName}: ${error.message}`);
        resolve(false);
        return;
      }
      
      const exists = stdout.trim() === 't';
      resolve(exists);
    });
  });
}

/**
 * دالة لاسترجاع البنية الأساسية لقاعدة البيانات من ملف التصميم
 */
async function restoreSchema() {
  // استخراج بيانات الاتصال من متغيرات البيئة
  const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE
  } = process.env;

  // التحقق من وجود ملف البنية
  if (fs.existsSync(schemaFile)) {
    console.log(`[${new Date().toISOString()}] استرجاع بنية قاعدة البيانات من ملف: ${schemaFile}`);
    
    // إنشاء أمر استعادة قاعدة البيانات
    const psql_cmd = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -f "${schemaFile}"`;
    
    // تنفيذ الأمر
    return new Promise((resolve, reject) => {
      exec(psql_cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] خطأ أثناء استرجاع بنية قاعدة البيانات: ${error.message}`);
          reject(error);
          return;
        }
        
        console.log(`[${new Date().toISOString()}] تم استرجاع بنية قاعدة البيانات بنجاح!`);
        resolve(true);
      });
    });
  } else {
    console.log(`[${new Date().toISOString()}] ملف بنية قاعدة البيانات غير موجود. سيتم إنشاء قاعدة البيانات باستخدام Drizzle.`);
    // سنستخدم Drizzle لإنشاء الجداول
    return runDrizzleMigrations();
  }
}

/**
 * دالة لاسترجاع آخر نسخة احتياطية كاملة
 * @returns {Promise<boolean>} نتيجة الاسترجاع - true إذا كان ناجحاً, false إذا فشل
 */
async function restoreLatestBackup() {
  // استخراج بيانات الاتصال من متغيرات البيئة
  const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE
  } = process.env;

  // التحقق من وجود مجلد النسخ الاحتياطية
  if (!fs.existsSync(backupDir)) {
    console.log(`[${new Date().toISOString()}] مجلد النسخ الاحتياطية غير موجود. سيتم إنشاء بنية قاعدة البيانات فقط.`);
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
    console.log(`[${new Date().toISOString()}] لم يتم العثور على ملفات نسخ احتياطية. سيتم إنشاء بنية قاعدة البيانات فقط.`);
    return false;
  }

  const latestBackup = files[0];
  console.log(`[${new Date().toISOString()}] استرجاع قاعدة البيانات من أحدث نسخة احتياطية: ${latestBackup.name}`);

  // إنشاء أمر استعادة قاعدة البيانات
  const psql_cmd = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -f "${latestBackup.path}"`;

  // تنفيذ الأمر
  return new Promise((resolve, reject) => {
    exec(psql_cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] خطأ أثناء استرجاع قاعدة البيانات: ${error.message}`);
        reject(error);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] تم استرجاع قاعدة البيانات بنجاح من النسخة الاحتياطية!`);
      resolve(true);
    });
  });
}

/**
 * دالة لتشغيل أوامر الهجرة الخاصة بـ Drizzle
 * @returns {Promise<boolean>} نتيجة العملية - true إذا كانت ناجحة, false إذا فشلت
 */
async function runDrizzleMigrations() {
  console.log(`[${new Date().toISOString()}] تشغيل أوامر الهجرة الخاصة بـ Drizzle...`);
  
  return new Promise((resolve, reject) => {
    exec('npm run db:push', (error, stdout, stderr) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] خطأ أثناء تنفيذ أوامر الهجرة: ${error.message}`);
        reject(error);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] تم تنفيذ أوامر الهجرة بنجاح!`);
      console.log(stdout);
      resolve(true);
    });
  });
}

/**
 * الدالة الرئيسية للتحقق من قاعدة البيانات واسترجاعها إذا لزم الأمر
 */
async function main() {
  console.log(`[${new Date().toISOString()}] بدء التحقق من قاعدة البيانات...`);
  
  try {
    // التحقق من إمكانية الاتصال بقاعدة البيانات
    const isConnected = await checkDatabaseConnection();
    
    if (!isConnected) {
      console.error(`[${new Date().toISOString()}] فشل الاتصال بقاعدة البيانات. تأكد من تكوين متغيرات البيئة بشكل صحيح.`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] تم الاتصال بقاعدة البيانات بنجاح.`);
    
    // التحقق من وجود الجداول الأساسية
    const usersTableExists = await checkTableExists('users');
    const signalsTableExists = await checkTableExists('signals');
    
    if (usersTableExists && signalsTableExists) {
      console.log(`[${new Date().toISOString()}] جداول قاعدة البيانات موجودة بالفعل. لا حاجة للاسترجاع.`);
    } else {
      console.log(`[${new Date().toISOString()}] بعض جداول قاعدة البيانات غير موجودة. بدء عملية الاسترجاع...`);
      
      try {
        // محاولة استرجاع آخر نسخة احتياطية كاملة
        const backupRestored = await restoreLatestBackup();
        
        if (!backupRestored) {
          // إذا لم يتم استرجاع النسخة الاحتياطية، استرجع البنية فقط
          await restoreSchema();
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] حدث خطأ أثناء عملية الاسترجاع: ${error.message}`);
        console.log(`[${new Date().toISOString()}] محاولة إنشاء البنية باستخدام Drizzle...`);
        await runDrizzleMigrations();
      }
    }
    
    console.log(`[${new Date().toISOString()}] اكتملت عملية التحقق والاسترجاع بنجاح.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] حدث خطأ غير متوقع: ${error.message}`);
  }
}

// تنفيذ الدالة الرئيسية
main();

module.exports = { 
  checkDatabaseConnection, 
  checkTableExists, 
  restoreSchema, 
  restoreLatestBackup, 
  runDrizzleMigrations 
};