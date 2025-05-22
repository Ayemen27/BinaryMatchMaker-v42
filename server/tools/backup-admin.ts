/**
 * أداة سطر الأوامر لإدارة النسخ الاحتياطي للمسؤول
 * 
 * يمكن للمسؤول استخدام هذه الأداة للتحكم في:
 * - إنشاء نسخة احتياطية يدوياً
 * - استرجاع نسخة احتياطية
 * - عرض قائمة النسخ الاحتياطية
 */

import { 
  createBackupManually, 
  listAvailableBackups, 
  restoreBackupByIndex 
} from './backup-cli';

// الحصول على معامل سطر الأوامر
const args = process.argv.slice(2);
const command = args[0];

// عرض مساعدة إذا لم يتم تحديد أمر
if (!command) {
  showHelp();
  process.exit(0);
}

// معالجة الأوامر
(async () => {
  switch (command) {
    case 'create':
      await createBackupManually();
      break;
      
    case 'list':
      listAvailableBackups();
      break;
      
    case 'restore':
      const backupIndex = args[1] ? parseInt(args[1], 10) : undefined;
      const success = await restoreBackupByIndex(backupIndex);
      
      if (success) {
        console.log('تم استرجاع النسخة الاحتياطية بنجاح');
      } else {
        console.error('فشل في استرجاع النسخة الاحتياطية');
        process.exit(1);
      }
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
})();

/**
 * عرض مساعدة الأوامر المتاحة
 */
function showHelp() {
  console.log(`
أداة إدارة النسخ الاحتياطي للمسؤول

الاستخدام:
  node server/tools/backup-admin.ts [أمر] [معاملات]

الأوامر المتاحة:
  create       إنشاء نسخة احتياطية جديدة
  list         عرض قائمة النسخ الاحتياطية المتوفرة
  restore [n]  استرجاع النسخة الاحتياطية رقم n (إذا لم يتم تحديد رقم، سيتم استخدام أحدث نسخة)
  help         عرض هذه المساعدة

أمثلة:
  node server/tools/backup-admin.ts create
  node server/tools/backup-admin.ts list
  node server/tools/backup-admin.ts restore 2
  `);
}