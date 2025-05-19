import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

/**
 * خدمة تسجيل الأخطاء والأحداث في الملفات
 */
export class Logger {
  private logDir: string;
  private errorLogPath: string;
  private accessLogPath: string;
  private signalLogPath: string;

  constructor() {
    // إنشاء مجلد للسجلات إذا لم يكن موجوداً
    this.logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // تحديد مسارات ملفات السجلات
    this.errorLogPath = path.join(this.logDir, 'error.log');
    this.accessLogPath = path.join(this.logDir, 'access.log');
    this.signalLogPath = path.join(this.logDir, 'signals.log');
  }

  /**
   * تسجيل خطأ مع التفاصيل والمكدس
   * @param source مصدر الخطأ
   * @param error كائن الخطأ
   * @param context سياق إضافي
   */
  error(source: string, error: Error, context: Record<string, any> = {}): void {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    const logEntry = {
      timestamp,
      source,
      message: errorMessage,
      stack: errorStack,
      context
    };
    
    const logText = `[${timestamp}] [ERROR] [${source}] ${errorMessage}\n${errorStack ? `Stack: ${errorStack}\n` : ''}Context: ${JSON.stringify(context)}\n\n`;
    
    fs.appendFileSync(this.errorLogPath, logText);
    
    // طباعة الخطأ في وحدة التحكم أيضاً في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] [${source}]`, { 
        message: errorMessage, 
        ...(errorStack ? { stack: errorStack } : {}), 
        context 
      });
    }
  }

  /**
   * تسجيل حدث وصول أو طلب API
   * @param method طريقة HTTP
   * @param url المسار
   * @param status الحالة
   * @param responseTime وقت الاستجابة بالميلي ثانية
   * @param userId معرف المستخدم (اختياري)
   */
  access(method: string, url: string, status: number, responseTime: number, userId?: number): void {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logText = `[${timestamp}] "${method} ${url}" ${status} ${responseTime}ms ${userId ? `User: ${userId}` : 'Anonymous'}\n`;
    
    fs.appendFileSync(this.accessLogPath, logText);
  }

  /**
   * تسجيل عمليات إنشاء واستخدام الإشارات
   * @param action نوع العملية المتعلقة بالإشارات
   * @param details تفاصيل إضافية
   * @param userId معرف المستخدم (اختياري)
   */
  signalActivity(action: 'generate' | 'view' | 'analyze' | 'error', details: Record<string, any>, userId?: number): void {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logEntry = {
      timestamp,
      action,
      userId: userId || 'anonymous',
      details
    };
    
    const logText = `[${timestamp}] [${action.toUpperCase()}] ${userId ? `User: ${userId}` : 'Anonymous'} ${JSON.stringify(details)}\n`;
    
    fs.appendFileSync(this.signalLogPath, logText);
  }

  /**
   * تسجيل معلومات عامة
   * @param source المصدر
   * @param message الرسالة
   * @param data بيانات إضافية (اختيارية)
   */
  info(source: string, message: string, data: Record<string, any> = {}): void {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      console.info(`[${timestamp}] [INFO] [${source}] ${message}`, Object.keys(data).length ? data : '');
    }
  }

  /**
   * تسجيل تحذير
   * @param source المصدر
   * @param message الرسالة
   * @param data بيانات إضافية (اختيارية)
   */
  warn(source: string, message: string, data: Record<string, any> = {}): void {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    console.warn(`[${timestamp}] [WARN] [${source}] ${message}`, Object.keys(data).length ? data : '');
  }
}

// إنشاء مثيل واحد للاستخدام في جميع أنحاء التطبيق
export const logger = new Logger();