const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
  process.exit(1);
}

// التحقق من ملف النسخة الاحتياطية المراد استخدامه
const backupDir = path.join(__dirname, '../backups');
const schemaFile = path.join(backupDir, 'schema.sql');

// التحقق إذا كان يجب استخدام ملف البنية فقط أو ملف نسخة احتياطية كامل
const args = process.argv.slice(2);
let backupFile = schemaFile; // افتراضيًا استخدم ملف البنية فقط

// إذا تم تمرير اسم ملف نسخة احتياطية كُمعاملة
if (args.length > 0) {
  const specifiedFile = args[0];
  const fullPath = specifiedFile.startsWith('/') 
    ? specifiedFile 
    : path.join(backupDir, specifiedFile);
  
  if (fs.existsSync(fullPath)) {
    backupFile = fullPath;
  } else {
    console.error(`خطأ: ملف النسخة الاحتياطية ${fullPath} غير موجود!`);
    process.exit(1);
  }
} else if (!fs.existsSync(schemaFile)) {
  console.error(`خطأ: ملف البنية ${schemaFile} غير موجود!`);
  process.exit(1);
}

console.log(`بدء استعادة قاعدة البيانات من الملف: ${backupFile}`);

// إنشاء أمر استعادة قاعدة البيانات
const psql_cmd = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -f "${backupFile}"`;

// تنفيذ الأمر
exec(psql_cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`خطأ أثناء استعادة قاعدة البيانات: ${error.message}`);
    return;
  }
  
  console.log('تم استعادة قاعدة البيانات بنجاح!');
  console.log(stdout);
  
  if (stderr) {
    console.warn('تحذيرات أثناء الاستعادة:');
    console.warn(stderr);
  }
});