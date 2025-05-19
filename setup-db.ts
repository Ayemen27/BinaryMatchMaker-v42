import { initializeDatabase } from './server/backup-manager';

// تنفيذ تهيئة قاعدة البيانات
async function setup() {
  console.log('بدء تهيئة قاعدة البيانات...');
  
  try {
    const success = await initializeDatabase();
    
    if (success) {
      console.log('تم تهيئة قاعدة البيانات بنجاح!');
      process.exit(0);
    } else {
      console.error('فشل في تهيئة قاعدة البيانات.');
      process.exit(1);
    }
  } catch (error) {
    console.error('حدث خطأ غير متوقع:', error);
    process.exit(1);
  }
}

setup();