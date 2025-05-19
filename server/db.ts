import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { initializeDatabase, startBackupSystem } from './backup-manager';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// محاولة تحميل متغيرات البيئة مباشرة
dotenv.config();

// طباعة القيم للتشخيص
console.log('متغيرات البيئة المتاحة:', {
  DATABASE_URL_DEFINED: Boolean(process.env.DATABASE_URL),
  SUPABASE_URL_DEFINED: Boolean(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY_DEFINED: Boolean(process.env.SUPABASE_ANON_KEY)
});

// تعيين قيم افتراضية للتطوير المحلي (سيتم استخدامها فقط إذا لم يتم تعيين المتغيرات البيئية)
// مع استخدام القيم الصحيحة من ملف .env
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Ay--772293228@db.iqeulzwbiovlsuytoxvk.supabase.co:5432/postgres";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://iqeulzwbiovlsuytoxvk.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXVsendiaW92bHN1eXRveHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODkxMzcsImV4cCI6MjA2MzI2NTEzN30.9Z8QjE9FNYAZYoRmi6iSCmxfIA0-yKSqOoOeXlhebjY";

// التحقق من توفر متغيرات البيئة اللازمة
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. تحتاج إلى تعيين رابط قاعدة بيانات Supabase.",
  );
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_URL و SUPABASE_ANON_KEY مطلوبة للاتصال بـ Supabase.",
  );
}

console.log('[نظام قاعدة البيانات] محاولة الاتصال بقاعدة بيانات Supabase...');

// إنشاء عميل Supabase
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// إنشاء مجمع اتصالات للاتصال المباشر بقاعدة بيانات PostgreSQL في Supabase
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// محاولة اختبار الاتصال
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[نظام قاعدة البيانات] فشل الاتصال بقاعدة البيانات:', err);
  } else {
    console.log('[نظام قاعدة البيانات] تم الاتصال بقاعدة البيانات بنجاح:', res.rows[0]);
  }
});

// إنشاء كائن db يستخدم اتصال PostgreSQL مباشرة دون الاعتماد على Drizzle ORM
export const db = {
  // select - للاستعلام عن البيانات
  select: async (columns = '*') => {
    return {
      from: (tableName: string) => {
        return {
          where: async (condition: Record<string, any>) => {
            try {
              const fieldName = Object.keys(condition)[0];
              const value = condition[fieldName];
              
              const query = `SELECT ${columns} FROM ${tableName} WHERE ${fieldName} = $1`;
              const result = await pool.query(query, [value]);
              return result.rows;
            } catch (error) {
              console.error('خطأ في استعلام البيانات:', error);
              return [];
            }
          },
          all: async () => {
            try {
              const query = `SELECT ${columns} FROM ${tableName}`;
              const result = await pool.query(query);
              return result.rows;
            } catch (error) {
              console.error('خطأ في استعلام جميع البيانات:', error);
              return [];
            }
          }
        };
      }
    };
  },
  
  // insert - لإدراج بيانات جديدة
  insert: async (values: Record<string, any>) => {
    return {
      into: async (tableName: string) => {
        try {
          const keys = Object.keys(values);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
          
          const result = await pool.query(query, Object.values(values));
          return result.rows[0];
        } catch (error) {
          console.error('خطأ في إدراج البيانات:', error);
          throw error;
        }
      }
    };
  },

  // update - لتحديث البيانات الموجودة
  update: async (tableName: string) => {
    return {
      set: (values: Record<string, any>) => {
        return {
          where: async (condition: Record<string, any>) => {
            try {
              const setClause = Object.keys(values)
                .map((key, i) => `${key} = $${i + 1}`)
                .join(', ');
              
              const fieldName = Object.keys(condition)[0];
              const fieldValue = condition[fieldName];
              
              const query = `UPDATE ${tableName} SET ${setClause} WHERE ${fieldName} = $${Object.keys(values).length + 1} RETURNING *`;
              const params = [...Object.values(values), fieldValue];
              
              const result = await pool.query(query, params);
              return result.rows[0];
            } catch (error) {
              console.error('خطأ في تحديث البيانات:', error);
              throw error;
            }
          }
        };
      }
    };
  },

  // delete - لحذف البيانات
  delete: async () => {
    return {
      from: (tableName: string) => {
        return {
          where: async (condition: Record<string, any>) => {
            try {
              const fieldName = Object.keys(condition)[0];
              const value = condition[fieldName];
              
              const query = `DELETE FROM ${tableName} WHERE ${fieldName} = $1 RETURNING *`;
              const result = await pool.query(query, [value]);
              return result.rows;
            } catch (error) {
              console.error('خطأ في حذف البيانات:', error);
              throw error;
            }
          }
        };
      }
    };
  },

  // query - للاستعلامات SQL المخصصة
  query: async (sql: string, params: any[] = []) => {
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('خطأ في استعلام SQL مخصص:', error);
      throw error;
    }
  },

  // تضمين واجهة Supabase للاستخدام المباشر عند الحاجة
  supabase,
  
  // تضمين مخطط قاعدة البيانات
  schema
};

// تهيئة قاعدة البيانات واسترجاعها إذا لزم الأمر
const initDB = async () => {
  console.log('[نظام قاعدة البيانات] بدء التحقق من قاعدة البيانات وتهيئتها...');
  try {
    await initializeDatabase();
    // بدء نظام النسخ الاحتياطي التلقائي
    startBackupSystem();
    console.log('[نظام قاعدة البيانات] تم تهيئة قاعدة البيانات بنجاح.');
  } catch (err) {
    console.error('[نظام قاعدة البيانات] خطأ أثناء تهيئة قاعدة البيانات:', err);
  }
};

// تنفيذ التهيئة بشكل غير متزامن
initDB();