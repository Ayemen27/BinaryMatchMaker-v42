/**
 * مدير قاعدة البيانات
 * مسؤول عن تهيئة والتحقق من حالة قاعدة البيانات
 */

import { db, pool } from "./db";
import { exec } from "child_process";
import { promisify } from "util";
import { storage } from "./storage";

// تحويل دالة exec إلى وعد Promise
const execAsync = promisify(exec);

/**
 * التحقق من وجود جدول معين في قاعدة البيانات
 * @param tableName اسم الجدول
 * @returns وعد يحل إلى قيمة منطقية تشير إلى وجود الجدول
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const query = {
      text: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists;
      `,
      values: [tableName]
    };
    
    const result = await pool.query(query);
    
    // التحقق من النتيجة بشكل آمن
    return result.rows.length > 0 ? result.rows[0].exists : false;
  } catch (error) {
    console.error(`[مدير قاعدة البيانات] خطأ أثناء التحقق من وجود الجدول ${tableName}:`, error);
    return false;
  }
}

/**
 * تنفيذ عمليات ترحيل قاعدة البيانات
 * ينشئ جداول قاعدة البيانات من مخطط الكود المصدري
 */
export async function runMigrations(): Promise<boolean> {
  try {
    console.log("[مدير قاعدة البيانات] بدء عملية ترحيل قاعدة البيانات...");
    
    // استخدام أمر drizzle-kit push عبر npm script
    const drizzlePushCmd = 'npm run db:push';
    const { stdout, stderr } = await execAsync(drizzlePushCmd);
    
    if (stderr && !stderr.includes('No migration')) {
      console.error("[مدير قاعدة البيانات] خطأ في ترحيل قاعدة البيانات:", stderr);
      return false;
    }
    
    console.log("[مدير قاعدة البيانات] تم ترحيل قاعدة البيانات بنجاح");
    return true;
  } catch (error) {
    console.error("[مدير قاعدة البيانات] خطأ في ترحيل قاعدة البيانات:", error);
    return false;
  }
}

/**
 * تهيئة قاعدة البيانات
 * تتحقق من وجود جداول في قاعدة البيانات وتنشئها إذا لم تكن موجودة
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log("[مدير قاعدة البيانات] بدء تهيئة قاعدة البيانات");
    
    // التحقق من وجود جدول رئيسي كمؤشر (جدول Users)
    const usersTableExists = await checkTableExists('users');
    
    if (!usersTableExists) {
      console.log("[مدير قاعدة البيانات] جدول المستخدمين غير موجود، بدء عملية إنشاء الجداول...");
      
      // تنفيذ ترحيل قاعدة البيانات
      const migrationSuccess = await runMigrations();
      
      if (!migrationSuccess) {
        console.error("[مدير قاعدة البيانات] فشل في إنشاء جداول قاعدة البيانات");
        return false;
      }
    } else {
      console.log("[مدير قاعدة البيانات] جداول قاعدة البيانات موجودة بالفعل");
    }
    
    return true;
  } catch (error) {
    console.error("[مدير قاعدة البيانات] خطأ أثناء تهيئة قاعدة البيانات:", error);
    return false;
  }
}