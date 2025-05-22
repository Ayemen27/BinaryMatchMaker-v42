/**
 * أداة إدارة النسخ الاحتياطي
 * 
 * هذه الأداة تسمح بإدارة النسخ الاحتياطي واسترجاعها
 * للاستخدام الداخلي فقط من قبل المسؤول
 */

import { 
  createBackup, 
  restoreFromBackup 
} from '../backup-manager';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

const backupDir = path.join(process.cwd(), 'backups');

/**
 * إنشاء نسخة احتياطية جديدة يدوياً
 */
export async function createBackupManually(): Promise<void> {
  console.log('[أدوات النسخ الاحتياطي] بدء إنشاء نسخة احتياطية يدوياً...');
  await createBackup();
  console.log('[أدوات النسخ الاحتياطي] اكتملت عملية النسخ الاحتياطي اليدوي');
}

/**
 * عرض قائمة النسخ الاحتياطية المتوفرة
 */
export function listAvailableBackups(): void {
  console.log('[أدوات النسخ الاحتياطي] قائمة النسخ الاحتياطية المتوفرة:');
  
  if (!fs.existsSync(backupDir)) {
    console.log('- لا يوجد مجلد للنسخ الاحتياطية');
    return;
  }
  
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && (file.endsWith('.json') || file.endsWith('.txt')))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        size: fs.statSync(path.join(backupDir, file)).size,
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime()); // ترتيب من الأحدث إلى الأقدم
    
    if (files.length === 0) {
      console.log('- لا توجد نسخ احتياطية متوفرة');
      return;
    }
    
    console.log(`تم العثور على ${files.length} نسخة احتياطية:`);
    
    files.forEach((file, index) => {
      const sizeInKB = (file.size / 1024).toFixed(2);
      console.log(`${index + 1}. ${file.name} - ${file.time.toLocaleString()} - ${sizeInKB} كيلوبايت`);
    });
    
  } catch (err) {
    console.error(`[أدوات النسخ الاحتياطي] خطأ أثناء قراءة مجلد النسخ الاحتياطية: ${err}`);
  }
}

/**
 * استرجاع نسخة احتياطية محددة
 * @param backupIndex رقم النسخة الاحتياطية في القائمة (يبدأ من 1)
 */
export async function restoreBackupByIndex(backupIndex?: number): Promise<boolean> {
  console.log('[أدوات النسخ الاحتياطي] بدء استرجاع نسخة احتياطية...');
  
  if (!fs.existsSync(backupDir)) {
    console.error('[أدوات النسخ الاحتياطي] خطأ: لا يوجد مجلد للنسخ الاحتياطية');
    return false;
  }
  
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
      console.log('[أدوات النسخ الاحتياطي] لا توجد نسخ احتياطية متوفرة للاسترجاع');
      return false;
    }
    
    let selectedBackup;
    
    if (!backupIndex || backupIndex <= 0 || backupIndex > files.length) {
      console.log('[أدوات النسخ الاحتياطي] لم يتم تحديد نسخة صالحة، سيتم استخدام أحدث نسخة');
      selectedBackup = files[0];
    } else {
      selectedBackup = files[backupIndex - 1];
    }
    
    console.log(`[أدوات النسخ الاحتياطي] استرجاع النسخة الاحتياطية: ${selectedBackup.name}`);
    
    return await restoreFromBackup(selectedBackup.path);
  } catch (err) {
    console.error(`[أدوات النسخ الاحتياطي] خطأ أثناء استرجاع النسخة الاحتياطية: ${err}`);
    return false;
  }
}