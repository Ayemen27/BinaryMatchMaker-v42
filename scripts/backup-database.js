const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجودًا
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

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

// إنشاء اسم ملف النسخة الاحتياطية مع التاريخ والوقت
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

// إنشاء أمر النسخ الاحتياطي
const pg_dump_cmd = `PGPASSWORD="${PGPASSWORD}" pg_dump -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -F p -f "${backupFile}"`;

console.log('بدء عملية النسخ الاحتياطي لقاعدة البيانات...');

// تنفيذ الأمر
exec(pg_dump_cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`خطأ: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`تحذير: ${stderr}`);
  }
  
  console.log(`تم إنشاء النسخة الاحتياطية بنجاح: ${backupFile}`);
  
  // إنشاء ملف SQL منفصل يحتوي فقط على هيكل قاعدة البيانات (بدون البيانات)
  const schemaFile = path.join(backupDir, 'schema.sql');
  const pg_dump_schema_cmd = `PGPASSWORD="${PGPASSWORD}" pg_dump -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} --schema-only -F p -f "${schemaFile}"`;
  
  exec(pg_dump_schema_cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`خطأ أثناء استخراج هيكل قاعدة البيانات: ${error.message}`);
      return;
    }
    
    console.log(`تم استخراج هيكل قاعدة البيانات بنجاح: ${schemaFile}`);
  });
});