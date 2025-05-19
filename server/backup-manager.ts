/**
 * نظام النسخ الاحتياطي والاسترجاع
 * 
 * هذا الملف يتعامل مع:
 * - تهيئة قاعدة البيانات واكتشاف الجداول
 * - النسخ الاحتياطي التلقائي كل 5 دقائق
 * - استرجاع البيانات عند اكتشاف عدم وجود جداول
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import path from 'path';

// تكوين النظام
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 دقائق بالميلي ثانية
const MAX_BACKUPS = 10; // الحد الأقصى لعدد النسخ الاحتياطية للاحتفاظ بها
const backupDir = path.join(process.cwd(), 'backups');

// إنشاء مجلد النسخ الاحتياطية إذا لم يكن موجودًا
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * دالة للتحقق من وجود الجداول في قاعدة البيانات
 * @param tableName اسم الجدول للتحقق منه
 * @returns وعد يحل إلى قيمة boolean
 */
export function checkTableExists(tableName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      PGHOST,
      PGPORT,
      PGUSER,
      PGPASSWORD,
      PGDATABASE
    } = process.env;

    if (!PGDATABASE) {
      console.error('[نظام النسخ الاحتياطي] خطأ: لم يتم العثور على متغيرات البيئة اللازمة لقاعدة البيانات!');
      resolve(false);
      return;
    }

    const query = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}');" -t`;
    
    exec(query, (error, stdout) => {
      if (error) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء التحقق من وجود الجدول ${tableName}: ${error.message}`);
        resolve(false);
        return;
      }
      
      const exists = stdout.trim() === 't';
      resolve(exists);
    });
  });
}

/**
 * دالة لإنشاء نسخة احتياطية من قاعدة البيانات تتضمن البيانات والبنية
 */
export function createBackup(): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  console.log(`[نظام النسخ الاحتياطي] بدء عملية النسخ الاحتياطي الشامل...`);
  
  try {
    // 1. إنشاء نسخة من هيكل قاعدة البيانات
    const schemaFile = path.join(backupDir, 'schema.sql');
    console.log(`[نظام النسخ الاحتياطي] جاري إنشاء نسخة من هيكل قاعدة البيانات...`);
    
    // 2. استخراج البيانات من كل جدول رئيسي باستخدام SQL
    const {
      PGHOST = '',
      PGPORT = '',
      PGUSER = '',
      PGPASSWORD = '',
      PGDATABASE = ''
    } = process.env;
    
    if (!PGHOST || !PGPORT || !PGUSER || !PGPASSWORD || !PGDATABASE) {
      console.error(`[نظام النسخ الاحتياطي] خطأ: متغيرات البيئة لقاعدة البيانات غير مكتملة!`);
      return;
    }
    
    // الحصول على قائمة جميع الجداول في قاعدة البيانات - هذا يضمن نسخ جميع الجداول
    execQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
    ).then(tablesResult => {
      // استخراج أسماء الجداول من النتيجة
      const tables = tablesResult.map(row => row.table_name);
    
      if (tables.length === 0) {
        console.log(`[نظام النسخ الاحتياطي] لم يتم العثور على أي جداول في قاعدة البيانات!`);
        return;
      }
      
      console.log(`[نظام النسخ الاحتياطي] تم العثور على ${tables.length} جدول سيتم نسخها احتياطيًا: ${tables.join(', ')}`);
      
      // إعداد كائن لتخزين بيانات كل الجداول
      const backup: any = {
        metadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          database: PGDATABASE,
          tables: tables
        },
        data: {}
      };
      
      // نستخدم Promise.all لتنفيذ جميع عمليات استخراج البيانات بالتوازي
      const extractPromises = tables.map(tableName => 
        new Promise((resolve) => {
          // استخدام دالة execQuery المساعدة مع التأكد من وجود متغيرات البيئة
          execQuery(
            `SELECT row_to_json(t) FROM ${tableName} t`,
            PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
          ).then(rows => {
            backup.data[tableName] = rows;
            console.log(`[نظام النسخ الاحتياطي] تم استخراج ${rows.length} سجل من جدول ${tableName}`);
            resolve(null);
          }).catch(error => {
            console.error(`[نظام النسخ الاحتياطي] خطأ أثناء استخراج بيانات جدول ${tableName}:`, error);
            backup.data[tableName] = [];
            resolve(null);
          });
        })
      );
      
      // ننتظر انتهاء جميع عمليات الاستخراج ثم نكتب الملف
      Promise.all(extractPromises).then(() => {
        try {
          // حفظ البيانات في ملف JSON
          fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
          console.log(`[نظام النسخ الاحتياطي] تم إنشاء نسخة احتياطية شاملة: ${backupFile}`);
          
          // أيضًا إنشاء سكريبت SQL بسيط للبنية باستخدام Drizzle
          exec('npm run db:push -- --dry-run', (error, stdout) => {
            if (!error && stdout) {
              try {
                fs.writeFileSync(schemaFile, 
                  `-- Schema generated on ${timestamp}\n-- Using drizzle-kit\n\n` + stdout
                );
                console.log(`[نظام النسخ الاحتياطي] تم تحديث ملف البنية بنجاح`);
              } catch (err) {
                console.error(`[نظام النسخ الاحتياطي] خطأ أثناء كتابة ملف البنية: ${err}`);
              }
            }
          });
          
          // تنظيف النسخ الاحتياطية القديمة
          cleanupOldBackups();
        } catch (err) {
          console.error(`[نظام النسخ الاحتياطي] خطأ أثناء كتابة ملف النسخة الاحتياطية: ${err}`);
        }
      }).catch(err => {
        console.error(`[نظام النسخ الاحتياطي] خطأ غير متوقع أثناء إنشاء النسخة الاحتياطية: ${err}`);
      });
    }).catch(error => {
      console.error(`[نظام النسخ الاحتياطي] خطأ أثناء الحصول على قائمة الجداول:`, error);
    });
  } catch(err) {
    console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إنشاء النسخة الاحتياطية: ${err}`);
  }
}

/**
 * دالة مساعدة لتنفيذ استعلامات SQL وإرجاع النتائج كمصفوفة من الكائنات
 */
function execQuery(query: string, host: string, port: string, user: string, password: string, database: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // استخدام طريقة أبسط لا تعتمد على أداة jq
    const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -t -A -c "${query}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn(`[نظام النسخ الاحتياطي] تحذير من تنفيذ الاستعلام:`, stderr);
      }
      
      try {
        // معالجة مخرجات الاستعلام
        const rows = stdout.trim().split('\n')
          .filter(line => line.trim() !== '');
          
        // إذا كان الاستعلام هو طلب أسماء الجداول، نعيد مصفوفة من الكائنات
        if (query.includes('information_schema.tables')) {
          resolve(rows.map(tableName => ({ table_name: tableName.trim() })));
        } else {
          // في حالة استخراج البيانات، نحاول تحليلها كـ JSON
          const parsedRows = rows.map(line => {
            try {
              // إذا كان النص يبدأ بـ { فمن المحتمل أنه JSON
              if (line.trim().startsWith('{')) {
                return JSON.parse(line.trim());
              } else {
                // إذا لم يكن JSON صالح، نعيده كسلسلة نصية عادية
                return { data: line.trim() };
              }
            } catch (e) {
              console.error(`[نظام النسخ الاحتياطي] خطأ في تحليل البيانات: ${e}`);
              return { raw: line.trim() };
            }
          });
          
          resolve(parsedRows);
        }
      } catch (e) {
        console.error(`[نظام النسخ الاحتياطي] خطأ في معالجة نتائج الاستعلام: ${e}`);
        reject(e);
      }
    });
  });
}

/**
 * دالة لحذف النسخ الاحتياطية القديمة للحفاظ على عدد محدد فقط
 */
function cleanupOldBackups(): void {
  try {
    // حصر ملفات النسخ الاحتياطية فقط (بدون ملف schema.sql)
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && (file.endsWith('.json') || file.endsWith('.txt')))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

    // حذف النسخ القديمة إذا تجاوز العدد الحد الأقصى
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`[نظام النسخ الاحتياطي] تم حذف نسخة احتياطية قديمة: ${file.name}`);
        } catch (err) {
          console.error(`[نظام النسخ الاحتياطي] خطأ أثناء حذف نسخة احتياطية قديمة (${file.name}): ${err}`);
        }
      });
    }
  } catch (err) {
    console.error(`[نظام النسخ الاحتياطي] خطأ أثناء قراءة مجلد النسخ الاحتياطية: ${err}`);
  }
}

/**
 * دالة لاسترجاع قاعدة البيانات من نسخة احتياطية شاملة
 * @param backupFilePath مسار ملف النسخة الاحتياطية
 * @returns وعد يحل إلى قيمة boolean
 */
export async function restoreFromBackup(backupFilePath?: string): Promise<boolean> {
  // البحث عن أحدث نسخة احتياطية إذا لم يتم تحديد الملف
  if (!backupFilePath) {
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
        console.log(`[نظام النسخ الاحتياطي] لم يتم العثور على ملفات نسخ احتياطية. سيتم إنشاء قاعدة البيانات فارغة.`);
        return await runMigrations();
      }

      backupFilePath = files[0].path;
      console.log(`[نظام النسخ الاحتياطي] استخدام أحدث نسخة احتياطية: ${files[0].name}`);
    } catch (err) {
      console.error(`[نظام النسخ الاحتياطي] خطأ أثناء البحث عن نسخ احتياطية: ${err}`);
      return await runMigrations();
    }
  }

  // التحقق من وجود ملف النسخة الاحتياطية
  if (!fs.existsSync(backupFilePath)) {
    console.error(`[نظام النسخ الاحتياطي] خطأ: ملف النسخة الاحتياطية غير موجود: ${backupFilePath}`);
    return await runMigrations();
  }

  // قراءة ملف النسخة الاحتياطية
  try {
    console.log(`[نظام النسخ الاحتياطي] بدء استرجاع البيانات من النسخة الاحتياطية: ${backupFilePath}`);
    
    // 1. إنشاء بنية قاعدة البيانات أولاً
    console.log(`[نظام النسخ الاحتياطي] إنشاء بنية قاعدة البيانات...`);
    const migrationsSuccess = await runMigrations();
    
    if (!migrationsSuccess) {
      console.error(`[نظام النسخ الاحتياطي] فشل في إنشاء بنية قاعدة البيانات`);
      return false;
    }
    
    // 2. قراءة بيانات النسخة الاحتياطية
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    if (!backupData || !backupData.data) {
      console.error(`[نظام النسخ الاحتياطي] ملف النسخة الاحتياطية غير صالح أو لا يحتوي على بيانات`);
      return false;
    }
    
    console.log(`[نظام النسخ الاحتياطي] تم قراءة بيانات النسخة الاحتياطية بنجاح`);
    
    // 3. استرجاع البيانات إلى الجداول
    const {
      PGHOST,
      PGPORT,
      PGUSER,
      PGPASSWORD,
      PGDATABASE
    } = process.env;
    
    // استرجاع كل جدول على حدة
    const tables = Object.keys(backupData.data);
    
    for (const tableName of tables) {
      const tableData = backupData.data[tableName];
      
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        console.log(`[نظام النسخ الاحتياطي] جدول ${tableName} فارغ أو غير موجود في النسخة الاحتياطية`);
        continue;
      }
      
      console.log(`[نظام النسخ الاحتياطي] استرجاع ${tableData.length} سجل إلى جدول ${tableName}...`);
      
      // نقوم أولاً بإفراغ الجدول
      const truncateQuery = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;"`;
      
      try {
        await new Promise<void>((resolve, reject) => {
          exec(truncateQuery, (error) => {
            if (error) {
              console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إفراغ جدول ${tableName}: ${error.message}`);
              // نستمر حتى مع وجود خطأ
              resolve();
              return;
            }
            console.log(`[نظام النسخ الاحتياطي] تم إفراغ جدول ${tableName} بنجاح`);
            resolve();
          });
        });
        
        // ثم نقوم بإدراج البيانات
        for (const row of tableData) {
          try {
            // بناء أمر إدراج أكثر موثوقية باستخدام قيم مفصولة
            const columns = Object.keys(row).filter(k => row[k] !== null);
            const values = columns.map(col => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return `'${String(val).replace(/'/g, "''")}'`;
            });
            
            // إنشاء أمر إدراج SQL مباشر (أكثر موثوقية من json_populate_record)
            const insertQuery = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "INSERT INTO ${tableName}(${columns.join(',')}) VALUES(${values.join(',')});"`;
            
            await new Promise<void>((resolve) => {
              exec(insertQuery, (error) => {
                if (error) {
                  console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إدراج بيانات في جدول ${tableName}: ${error.message}`);
                  // نستمر مع السجل التالي
                  resolve();
                  return;
                }
                resolve();
              });
            });
          } catch (err) {
            console.error(`[نظام النسخ الاحتياطي] خطأ في معالجة بيانات لإدراجها في ${tableName}:`, err);
          }
        }
        
        console.log(`[نظام النسخ الاحتياطي] تم استرجاع جدول ${tableName} بنجاح`);
      } catch (err) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء استرجاع جدول ${tableName}: ${err}`);
      }
    }
    
    console.log(`[نظام النسخ الاحتياطي] تم استرجاع قاعدة البيانات بنجاح!`);
    return true;
    
  } catch (err) {
    console.error(`[نظام النسخ الاحتياطي] خطأ أثناء استرجاع النسخة الاحتياطية: ${err}`);
    return false;
  }
}

/**
 * دالة لتشغيل أوامر الهجرة الخاصة بـ Drizzle مع محاولات إعادة في حالة الفشل
 * @param retryCount عدد محاولات الإعادة المتبقية
 * @returns وعد يحل إلى قيمة boolean
 */
export function runMigrations(retryCount = 3): Promise<boolean> {
  console.log(`[نظام النسخ الاحتياطي] تشغيل أوامر الهجرة الخاصة بـ Drizzle... (محاولات متبقية: ${retryCount})`);
  
  // استخدام خيار -w للانتظار حتى اكتمال العملية
  const command = 'NODE_OPTIONS="--max-old-space-size=512" npm run db:push';
  
  return new Promise((resolve) => {
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error || stderr.includes('error')) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء تنفيذ أوامر الهجرة: ${error?.message || stderr}`);
        
        // إذا كان هناك محاولات إضافية متاحة، حاول مرة أخرى بعد تأخير قصير
        if (retryCount > 0) {
          console.log(`[نظام النسخ الاحتياطي] إعادة المحاولة بعد 2 ثانية...`);
          setTimeout(() => {
            runMigrations(retryCount - 1).then(resolve);
          }, 2000);
          return;
        }
        
        // إذا استنفدنا جميع المحاولات، حاول تنفيذ مقاربة أخرى (قم بإنشاء الجداول مباشرة)
        console.log(`[نظام النسخ الاحتياطي] استنفدنا جميع محاولات أوامر الهجرة. محاولة إنشاء الجداول مباشرة...`);
        createTablesDirectly().then(resolve);
        return;
      }
      
      console.log(`[نظام النسخ الاحتياطي] تم تنفيذ أوامر الهجرة بنجاح!`);
      if (stdout) {
        console.log(`[نظام النسخ الاحتياطي] نتائج تنفيذ أوامر الهجرة:`);
        console.log(stdout);
      }
      resolve(true);
    });
  });
}

/**
 * دالة احتياطية لإنشاء الجداول مباشرة في حالة فشل أوامر الهجرة
 * @returns وعد يحل إلى قيمة boolean
 */
function createTablesDirectly(): Promise<boolean> {
  const {
    PGHOST,
    PGPORT,
    PGUSER,
    PGPASSWORD,
    PGDATABASE
  } = process.env;

  if (!PGDATABASE) {
    console.error('[نظام النسخ الاحتياطي] خطأ: لم يتم العثور على متغيرات البيئة اللازمة لقاعدة البيانات!');
    return Promise.resolve(false);
  }

  console.log('[نظام النسخ الاحتياطي] محاولة إنشاء الجداول مباشرة من خلال SQL...');

  // قائمة بجمل SQL لإنشاء الجداول الأساسية
  // ملاحظة: هذه هي النسخة المبسطة فقط للجداول الأساسية
  const createTablesSQL = `
    -- إنشاء التعدادات
    DO $$ BEGIN
      CREATE TYPE subscription_type AS ENUM ('free', 'basic', 'pro', 'vip');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE signal_type AS ENUM ('buy', 'sell');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE signal_status AS ENUM ('active', 'completed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE signal_result AS ENUM ('success', 'failure');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE notification_type AS ENUM ('signal', 'market', 'account', 'system');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- إنشاء الجداول الرئيسية
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      language TEXT DEFAULT 'ar',
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT DEFAULT 'dark',
      chart_type TEXT DEFAULT 'candles',
      timeframe TEXT DEFAULT '1h',
      show_indicators BOOLEAN DEFAULT true,
      default_currency TEXT DEFAULT 'USD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_notification_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT true,
      push_notifications BOOLEAN DEFAULT true,
      trade_alerts BOOLEAN DEFAULT true,
      market_updates BOOLEAN DEFAULT true,
      account_notifications BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      type subscription_type DEFAULT 'free',
      starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      auto_renew BOOLEAN DEFAULT false,
      max_signals INTEGER DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signals (
      id SERIAL PRIMARY KEY,
      asset TEXT NOT NULL,
      type signal_type NOT NULL,
      price TEXT NOT NULL,
      target_price TEXT NOT NULL,
      stop_loss TEXT,
      confidence_level INTEGER DEFAULT 70,
      timeframe TEXT DEFAULT '1h',
      status signal_status DEFAULT 'active',
      result signal_result,
      expiration_time TIMESTAMP,
      source TEXT DEFAULT 'AI',
      analysis TEXT,
      chart_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_signals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      signal_id INTEGER NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
      is_favorite BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, signal_id)
    );

    CREATE TABLE IF NOT EXISTS user_signal_usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE DEFAULT CURRENT_DATE,
      generated INTEGER DEFAULT 0,
      viewed INTEGER DEFAULT 0,
      analyzed INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type notification_type DEFAULT 'system',
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS market_data (
      id SERIAL PRIMARY KEY,
      asset TEXT NOT NULL,
      price TEXT NOT NULL,
      change_24h TEXT,
      high_24h TEXT,
      low_24h TEXT,
      volume_24h TEXT,
      market_cap TEXT,
      data_source TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  return new Promise((resolve) => {
    const createTablesCommand = `PGPASSWORD="${PGPASSWORD}" psql -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDATABASE} -c "${createTablesSQL.replace(/"/g, '\\"')}"`;
    
    exec(createTablesCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء إنشاء الجداول مباشرة: ${error.message}`);
        console.error(stderr);
        resolve(false);
        return;
      }
      
      console.log(`[نظام النسخ الاحتياطي] تم إنشاء الجداول الرئيسية بنجاح!`);
      if (stdout) {
        console.log(`[نظام النسخ الاحتياطي] نتائج إنشاء الجداول:`);
        console.log(stdout);
      }
      resolve(true);
    });
  });
}

/**
 * بدء نظام النسخ الاحتياطي الدوري
 */
export function startBackupSystem(): void {
  console.log(`[نظام النسخ الاحتياطي] بدء نظام النسخ الاحتياطي التلقائي (كل ${BACKUP_INTERVAL/1000/60} دقائق)`);
  
  // إنشاء نسخة احتياطية أولية
  createBackup();
  
  // بدء النسخ الاحتياطي بشكل دوري
  setInterval(createBackup, BACKUP_INTERVAL);
}

/**
 * الدالة الرئيسية للتهيئة والتحقق من قاعدة البيانات واسترجاعها إذا لزم الأمر
 */
export async function initializeDatabase(): Promise<boolean> {
  console.log(`[نظام النسخ الاحتياطي] بدء تهيئة نظام قاعدة البيانات...`);
  
  try {
    // التحقق من وجود الجداول الأساسية
    const usersTableExists = await checkTableExists('users');
    const signalsTableExists = await checkTableExists('signals');
    
    if (usersTableExists && signalsTableExists) {
      console.log(`[نظام النسخ الاحتياطي] جداول قاعدة البيانات موجودة بالفعل. لا حاجة للاسترجاع.`);
      return true;
    } else {
      console.log(`[نظام النسخ الاحتياطي] بعض جداول قاعدة البيانات غير موجودة. بدء عملية الاسترجاع...`);
      
      // محاولة استرجاع البيانات من نسخة احتياطية
      console.log(`[نظام النسخ الاحتياطي] البحث عن نسخة احتياطية لاسترجاع البيانات...`);
      
      try {
        // البحث عن نسخ احتياطية
        const files = fs.readdirSync(backupDir)
          .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
          .map(file => ({
            name: file,
            path: path.join(backupDir, file),
            time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time); // ترتيب من الأحدث إلى الأقدم

        if (files.length > 0) {
          // وجدنا نسخة احتياطية، سنحاول استرجاعها
          console.log(`[نظام النسخ الاحتياطي] تم العثور على نسخة احتياطية: ${files[0].name}`);
          const restored = await restoreFromBackup(files[0].path);
          
          if (restored) {
            console.log(`[نظام النسخ الاحتياطي] تم استرجاع قاعدة البيانات بنجاح من النسخة الاحتياطية!`);
            return true;
          } else {
            console.log(`[نظام النسخ الاحتياطي] فشل في استرجاع النسخة الاحتياطية. محاولة إنشاء قاعدة بيانات جديدة...`);
          }
        } else {
          console.log(`[نظام النسخ الاحتياطي] لم يتم العثور على نسخ احتياطية.`);
        }
      } catch (err) {
        console.error(`[نظام النسخ الاحتياطي] خطأ أثناء البحث عن نسخ احتياطية: ${err}`);
      }
      
      // إذا فشلت عملية الاسترجاع أو لم نجد نسخ احتياطية، ننشئ قاعدة بيانات جديدة
      console.log(`[نظام النسخ الاحتياطي] إنشاء جداول قاعدة البيانات باستخدام Drizzle...`);
      return await runMigrations();
    }
  } catch (error) {
    console.error(`[نظام النسخ الاحتياطي] حدث خطأ غير متوقع: ${error}`);
    return false;
  }
}