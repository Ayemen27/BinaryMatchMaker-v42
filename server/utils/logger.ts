/**
 * نظام سجلات متقدم لتطبيق منصة التداول
 * يوفر طرق عرض موحدة للسجلات مع اختلاف مستويات الأهمية
 */

// نوع البيانات الذي سيتم إرساله مع كل سجل
export interface LogData {
  userId?: number;
  action?: string;
  component?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// فئات السجلات
type LogCategory = 'auth' | 'settings' | 'notification' | 'api' | 'signals' | 'system' | 'database';

// مستويات السجلات
type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace';

// خيارات التنسيق
const colors = {
  info: '\x1b[32m', // أخضر
  warn: '\x1b[33m', // أصفر
  error: '\x1b[31m', // أحمر
  debug: '\x1b[36m', // أزرق فاتح
  trace: '\x1b[90m', // رمادي
  reset: '\x1b[0m', // إعادة تعيين اللون
  category: {
    auth: '\x1b[35m', // بنفسجي
    settings: '\x1b[34m', // أزرق
    notification: '\x1b[33m', // أصفر
    api: '\x1b[36m', // أزرق فاتح
    signals: '\x1b[32m', // أخضر
    system: '\x1b[37m', // أبيض
    database: '\x1b[90m', // رمادي
  }
};

/**
 * فئة نظام السجلات المركزي
 */
class Logger {
  private logToConsole: boolean;
  private logToDatabase: boolean;
  private debugMode: boolean;

  constructor() {
    this.logToConsole = true;
    this.logToDatabase = false; // حاليًا لا نخزن في قاعدة البيانات، يمكن تفعيله لاحقًا
    this.debugMode = process.env.NODE_ENV !== 'production';
  }

  /**
   * تسجيل معلومات
   */
  info(category: LogCategory, message: string, data: LogData = {}) {
    this.log('info', category, message, data);
  }

  /**
   * تسجيل تحذير
   */
  warn(category: LogCategory, message: string, data: LogData = {}) {
    this.log('warn', category, message, data);
  }

  /**
   * تسجيل خطأ
   */
  error(category: LogCategory, message: string, data: LogData = {}) {
    this.log('error', category, message, data);
  }

  /**
   * تسجيل معلومات تصحيح الأخطاء
   */
  debug(category: LogCategory, message: string, data: LogData = {}) {
    if (this.debugMode) {
      this.log('debug', category, message, data);
    }
  }

  /**
   * تسجيل معلومات تتبع مفصلة
   */
  trace(category: LogCategory, message: string, data: LogData = {}) {
    if (this.debugMode) {
      this.log('trace', category, message, data);
    }
  }

  /**
   * التسجيل الأساسي بتنسيق موحد
   */
  private log(level: LogLevel, category: LogCategory, message: string, data: LogData = {}) {
    const timestamp = new Date();
    const formattedData = { ...data, timestamp };
    
    if (this.logToConsole) {
      this.logToConsoleOutput(level, category, message, formattedData);
    }
    
    if (this.logToDatabase) {
      // سيتم تنفيذه لاحقًا
      this.logToDatabaseStorage(level, category, message, formattedData);
    }
  }

  /**
   * إخراج السجلات إلى وحدة التحكم
   */
  private logToConsoleOutput(level: LogLevel, category: LogCategory, message: string, data: LogData) {
    const timestamp = data.timestamp?.toISOString() || new Date().toISOString();
    const levelColor = colors[level];
    const categoryColor = colors.category[category];
    const userInfo = data.userId ? `[مستخدم: ${data.userId}]` : '';
    
    // تنسيق بداية السجل
    let formattedLog = `[${timestamp}] ${levelColor}[${level.toUpperCase()}]${colors.reset} ${categoryColor}[${category}]${colors.reset} ${message} ${userInfo}`;
    
    // إذا كانت هناك بيانات إضافية، عرضها بشكل جميل
    if (Object.keys(data).length > 2) { // أكثر من timestamp و userId
      const { timestamp, userId, ...restData } = data;
      console.log(formattedLog);
      console.dir(restData, { depth: 4, colors: true });
    } else {
      console.log(formattedLog);
    }
  }

  /**
   * تخزين السجلات في قاعدة البيانات (للتنفيذ في المستقبل)
   */
  private logToDatabaseStorage(level: LogLevel, category: LogCategory, message: string, data: LogData) {
    // يمكن تنفيذ هذه الوظيفة لاحقًا إذا لزم الأمر لتخزين السجلات الهامة في قاعدة البيانات
  }
}

// إنشاء نسخة واحدة من نظام السجلات
const logger = new Logger();

export default logger;