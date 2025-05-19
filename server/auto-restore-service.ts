/**
 * خدمة الاستعادة التلقائية للبيانات
 * 
 * تقوم هذه الخدمة باسترجاع البيانات تلقائيًا عند اكتشاف قاعدة بيانات جديدة
 * أو عندما تكون الجداول فارغة من البيانات
 */

import fs from 'fs';
import path from 'path';
import { db, pool } from './db';
import { checkTableExists } from './db-manager';
import { storage } from './storage';

// مسار مجلد النسخ الاحتياطية
const backupDir = path.join(process.cwd(), 'backups');

/**
 * التحقق من وجود بيانات في جدول معين
 * @param tableName اسم الجدول
 * @returns وعد يحل إلى قيمة منطقية تشير إلى وجود بيانات في الجدول
 */
export async function checkTableHasData(tableName: string): Promise<boolean> {
  try {
    const query = {
      text: `SELECT EXISTS (SELECT 1 FROM ${tableName} LIMIT 1) as has_data;`,
    };
    
    const result = await pool.query(query);
    return result.rows.length > 0 ? result.rows[0].has_data : false;
  } catch (error) {
    console.error(`[خدمة الاستعادة التلقائية] خطأ أثناء التحقق من وجود بيانات في الجدول ${tableName}:`, error);
    return false;
  }
}

/**
 * العثور على أحدث ملف نسخة احتياطية
 * @returns مسار أحدث ملف نسخة احتياطية أو null إذا لم يتم العثور على أي ملف
 */
export function findLatestBackupFile(): string | null {
  try {
    if (!fs.existsSync(backupDir)) {
      console.log('[خدمة الاستعادة التلقائية] مجلد النسخ الاحتياطية غير موجود.');
      return null;
    }
    
    // البحث عن ملفات النسخ الاحتياطية (ملفات JSON)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime()); // ترتيب من الأحدث إلى الأقدم
    
    if (backupFiles.length === 0) {
      console.log('[خدمة الاستعادة التلقائية] لم يتم العثور على ملفات نسخ احتياطية.');
      return null;
    }
    
    console.log(`[خدمة الاستعادة التلقائية] تم العثور على أحدث نسخة احتياطية: ${backupFiles[0].name}`);
    return backupFiles[0].path;
  } catch (error) {
    console.error('[خدمة الاستعادة التلقائية] خطأ أثناء البحث عن ملف النسخة الاحتياطية:', error);
    return null;
  }
}

/**
 * استرجاع البيانات من ملف النسخة الاحتياطية
 * @param backupFilePath مسار ملف النسخة الاحتياطية
 * @returns وعد يحل إلى قيمة منطقية تشير إلى نجاح العملية
 */
export async function restoreDataFromBackup(backupFilePath: string): Promise<boolean> {
  try {
    console.log(`[خدمة الاستعادة التلقائية] بدء استرجاع البيانات من الملف: ${backupFilePath}`);
    
    // قراءة ملف النسخة الاحتياطية
    const backupData = fs.readFileSync(backupFilePath, 'utf8');
    const data = JSON.parse(backupData);
    
    // إدخال البيانات في الجداول
    await insertBackupData(data);
    
    console.log('[خدمة الاستعادة التلقائية] تم استرجاع البيانات بنجاح');
    return true;
  } catch (error) {
    console.error('[خدمة الاستعادة التلقائية] خطأ أثناء استرجاع البيانات:', error);
    return false;
  }
}

/**
 * إدخال البيانات من النسخة الاحتياطية إلى الجداول
 * @param data بيانات النسخة الاحتياطية
 */
async function insertBackupData(data: any): Promise<void> {
  // التحقق من وجود بيانات للإدخال
  if (!data || typeof data !== 'object') {
    throw new Error('بيانات النسخة الاحتياطية غير صالحة');
  }
  
  // معالجة البيانات لكل جدول
  for (const tableName in data) {
    const tableData = data[tableName];
    
    // التحقق من أن الجدول موجود قبل محاولة إدخال البيانات
    const tableExists = await checkTableExists(tableName);
    if (!tableExists) {
      console.warn(`[خدمة الاستعادة التلقائية] تم تخطي جدول ${tableName} لأنه غير موجود`);
      continue;
    }
    
    // التحقق من وجود بيانات للإدخال
    if (!Array.isArray(tableData) || tableData.length === 0) {
      console.log(`[خدمة الاستعادة التلقائية] لا توجد بيانات لإدخالها في جدول ${tableName}`);
      continue;
    }
    
    console.log(`[خدمة الاستعادة التلقائية] إدخال ${tableData.length} سجل في جدول ${tableName}`);
    
    // إنشاء استعلام الإدخال
    for (const record of tableData) {
      try {
        // استخراج أسماء الأعمدة والقيم
        const columns = Object.keys(record);
        const values = Object.values(record);
        
        // بناء استعلام الإدخال
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = {
          text: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`,
          values: values,
        };
        
        // تنفيذ الاستعلام
        await pool.query(query);
      } catch (error) {
        console.error(`[خدمة الاستعادة التلقائية] خطأ أثناء إدخال سجل في جدول ${tableName}:`, error);
      }
    }
  }
}

/**
 * فحص ما إذا كانت قاعدة البيانات تحتاج إلى استرجاع البيانات
 * @returns وعد يحل إلى قيمة منطقية تشير إلى ما إذا كانت قاعدة البيانات تحتاج إلى استرجاع
 */
export async function needsDataRestore(): Promise<boolean> {
  try {
    // التحقق من وجود جدول المستخدمين
    const usersTableExists = await checkTableExists('users');
    if (!usersTableExists) {
      console.log('[خدمة الاستعادة التلقائية] جدول المستخدمين غير موجود، لا يمكن استرجاع البيانات حتى يتم إنشاء الجداول أولاً');
      return false; // لا يمكن استرجاع البيانات إذا لم تكن الجداول موجودة بعد
    }
    
    // التحقق من وجود ملف نسخة احتياطية
    const backupFile = findLatestBackupFile();
    if (!backupFile) {
      console.log('[خدمة الاستعادة التلقائية] لا توجد ملفات نسخ احتياطية متاحة لاسترجاع البيانات');
      return false; // لا يمكن استرجاع البيانات إذا لم تكن هناك نسخة احتياطية
    }
    
    // التحقق من عدد المستخدمين في قاعدة البيانات
    const query = {
      text: `SELECT COUNT(*) as user_count FROM users;`,
    };
    
    const result = await pool.query(query);
    const userCount = parseInt(result.rows[0].user_count, 10);
    
    // التحقق من عدد المستخدمين في ملف النسخة الاحتياطية
    try {
      const backupData = fs.readFileSync(backupFile, 'utf8');
      const data = JSON.parse(backupData);
      
      if (data && data.data && Array.isArray(data.data.users)) {
        const backupUserCount = data.data.users.length;
        
        console.log(`[خدمة الاستعادة التلقائية] عدد المستخدمين في قاعدة البيانات: ${userCount}, عدد المستخدمين في النسخة الاحتياطية: ${backupUserCount}`);
        
        // إذا كانت النسخة الاحتياطية تحتوي على عدد أكبر من المستخدمين، نقوم بالاسترجاع
        if (backupUserCount > userCount) {
          console.log('[خدمة الاستعادة التلقائية] النسخة الاحتياطية تحتوي على عدد أكبر من المستخدمين، سيتم استرجاع البيانات');
          return true;
        } else {
          console.log('[خدمة الاستعادة التلقائية] لا حاجة للاسترجاع حيث أن عدد المستخدمين الحالي أكبر أو يساوي عدد المستخدمين في النسخة الاحتياطية');
          return false;
        }
      }
    } catch (error) {
      console.error('[خدمة الاستعادة التلقائية] خطأ أثناء قراءة ملف النسخة الاحتياطية:', error);
    }
    
    // إذا وصلنا إلى هنا ولم نتمكن من تحديد عدد المستخدمين في النسخة الاحتياطية، نفترض أننا بحاجة إلى الاسترجاع
    console.log('[خدمة الاستعادة التلقائية] قاعدة البيانات تحتاج إلى استرجاع البيانات');
    return true;
  } catch (error) {
    console.error('[خدمة الاستعادة التلقائية] خطأ أثناء التحقق من حاجة قاعدة البيانات للاسترجاع:', error);
    return false;
  }
}

/**
 * تنفيذ عملية الاسترجاع التلقائي للبيانات إذا لزم الأمر
 * @returns وعد يحل إلى قيمة منطقية تشير إلى نجاح العملية
 */
export async function runAutoRestore(): Promise<boolean> {
  try {
    console.log('[خدمة الاستعادة التلقائية] بدء فحص الحاجة لاسترجاع البيانات تلقائيًا...');
    
    // التحقق مما إذا كانت قاعدة البيانات تحتاج إلى استرجاع
    const needsRestore = await needsDataRestore();
    if (!needsRestore) {
      console.log('[خدمة الاستعادة التلقائية] لا حاجة لاسترجاع البيانات تلقائيًا');
      return false;
    }
    
    // البحث عن أحدث ملف نسخة احتياطية
    const backupFile = findLatestBackupFile();
    if (!backupFile) {
      console.error('[خدمة الاستعادة التلقائية] لا يمكن العثور على ملف النسخة الاحتياطية');
      return false;
    }
    
    // استرجاع البيانات من ملف النسخة الاحتياطية
    const success = await restoreDataFromBackup(backupFile);
    
    if (success) {
      console.log('[خدمة الاستعادة التلقائية] تم استرجاع البيانات تلقائيًا بنجاح');
      return true;
    } else {
      console.error('[خدمة الاستعادة التلقائية] فشل في استرجاع البيانات تلقائيًا');
      return false;
    }
  } catch (error) {
    console.error('[خدمة الاستعادة التلقائية] خطأ أثناء تنفيذ عملية الاسترجاع التلقائي:', error);
    return false;
  }
}