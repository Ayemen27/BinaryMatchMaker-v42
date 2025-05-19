/**
 * خدمة مراقبة الترجمات ورصد النصوص غير المترجمة
 * 
 * تقوم هذه الخدمة بـ:
 * 1. رصد النصوص التي تظهر بلغة مختلفة عن لغة المستخدم المحددة
 * 2. تسجيل معلومات عن الكلمات غير المترجمة
 * 3. إنشاء تقارير للمسؤولين عن النصوص التي تحتاج لترجمة
 */

import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import { SupportedLanguages } from '../i18n/translations';

// مجلد لحفظ سجلات النصوص غير المترجمة
const MISSING_TRANSLATIONS_DIR = path.join(process.cwd(), 'logs', 'missing-translations');

// التأكد من وجود المجلد
if (!fs.existsSync(MISSING_TRANSLATIONS_DIR)) {
  fs.mkdirSync(MISSING_TRANSLATIONS_DIR, { recursive: true });
}

// تخزين النصوص غير المترجمة المكتشفة
interface MissingTranslation {
  text: string;        // النص غير المترجم
  expectedLanguage: string;  // اللغة المتوقعة
  detectedLanguage: string;   // اللغة المكتشفة
  location: string;    // موقع النص في التطبيق
  userId?: number;     // معرف المستخدم الذي شاهد النص (إذا كان متاحاً)
  count: number;       // عدد مرات ظهور النص غير المترجم
  timestamp: Date;     // وقت أول اكتشاف
  lastSeen: Date;      // آخر مرة شوهد فيها النص
}

class TranslationMonitor {
  private missingTranslationsCache: Map<string, MissingTranslation> = new Map();
  private reportInterval: NodeJS.Timer | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // بدء المراقبة والإبلاغ التلقائي
    this.startPeriodicReporting();
  }

  /**
   * تحديد ما إذا كان النص يحتوي على أحرف غير متوافقة مع اللغة المتوقعة
   * @param text النص للفحص
   * @param expectedLanguage اللغة المتوقعة
   * @returns معلومات عن اللغة المكتشفة
   */
  private detectLanguageMismatch(text: string, expectedLanguage: SupportedLanguages): {
    isMismatch: boolean,
    detectedLanguage: string
  } {
    // مجموعة الأحرف العربية الأساسية
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    
    // مجموعة الأحرف الإنجليزية الأساسية
    const englishRegex = /[a-zA-Z]/;
    
    // فحص اللغة
    const hasArabic = arabicRegex.test(text);
    const hasEnglish = englishRegex.test(text);
    
    // تحديد اللغة المكتشفة
    let detectedLanguage = 'unknown';
    
    if (hasArabic && !hasEnglish) {
      detectedLanguage = 'ar';
    } else if (hasEnglish && !hasArabic) {
      detectedLanguage = 'en';
    } else if (hasArabic && hasEnglish) {
      detectedLanguage = 'mixed';
    }
    
    // تحديد ما إذا كان هناك عدم تطابق
    const isMismatch = (expectedLanguage === 'ar' && detectedLanguage === 'en') || 
                      (expectedLanguage === 'en' && detectedLanguage === 'ar');
    
    return { isMismatch, detectedLanguage };
  }

  /**
   * تسجيل نص غير مترجم
   * @param text النص غير المترجم
   * @param expectedLanguage اللغة المتوقعة
   * @param location موقع النص في التطبيق
   * @param userId معرف المستخدم (اختياري)
   */
  public reportMissingTranslation(
    text: string,
    expectedLanguage: SupportedLanguages,
    location: string,
    userId?: number
  ): void {
    if (!this.isEnabled || !text || text.trim() === '') {
      return;
    }
    
    // اكتشاف اللغة
    const { isMismatch, detectedLanguage } = this.detectLanguageMismatch(text, expectedLanguage);
    
    if (!isMismatch) {
      return; // لا يوجد عدم تطابق في اللغة
    }
    
    // إنشاء مفتاح فريد للنص وموقعه
    const key = `${text}|${location}|${expectedLanguage}`;
    
    // تحديث أو إنشاء سجل جديد
    if (this.missingTranslationsCache.has(key)) {
      const entry = this.missingTranslationsCache.get(key)!;
      entry.count++;
      entry.lastSeen = new Date();
      
      // إضافة معرف المستخدم إذا لم يكن موجوداً
      if (userId && !entry.userId) {
        entry.userId = userId;
      }
      
      this.missingTranslationsCache.set(key, entry);
    } else {
      const now = new Date();
      this.missingTranslationsCache.set(key, {
        text,
        expectedLanguage,
        detectedLanguage,
        location,
        userId,
        count: 1,
        timestamp: now,
        lastSeen: now
      });
      
      // تسجيل في السجلات فوراً للمشاكل الجديدة
      logger.warn("TranslationMonitor", `اكتشاف نص غير مترجم: "${text}" في ${location}`, {
        expectedLanguage,
        detectedLanguage,
        userId
      });
    }
    
    // حفظ التغييرات في ملف
    this.saveToFile();
  }
  
  /**
   * حفظ النصوص غير المترجمة في ملف
   */
  private saveToFile(): void {
    try {
      const reportFile = path.join(MISSING_TRANSLATIONS_DIR, 'missing-translations.json');
      
      // تحويل Map إلى مصفوفة للتخزين
      const missingTranslations = Array.from(this.missingTranslationsCache.values());
      
      fs.writeFileSync(
        reportFile,
        JSON.stringify(missingTranslations, null, 2),
        'utf8'
      );
    } catch (error) {
      logger.error("TranslationMonitor", new Error(`فشل في حفظ سجل النصوص غير المترجمة: ${error}`));
    }
  }
  
  /**
   * إنشاء تقرير إحصائي عن النصوص غير المترجمة
   */
  public generateReport(): {
    totalMissingTranslations: number,
    byLanguage: Record<string, number>,
    mostCommon: Array<{ text: string, count: number, location: string }>,
    recentDiscoveries: MissingTranslation[]
  } {
    const missingTranslations = Array.from(this.missingTranslationsCache.values());
    
    // الإحصائيات حسب اللغة
    const byLanguage: Record<string, number> = {};
    
    missingTranslations.forEach(item => {
      const key = `${item.expectedLanguage}->${item.detectedLanguage}`;
      byLanguage[key] = (byLanguage[key] || 0) + 1;
    });
    
    // النصوص الأكثر شيوعاً
    const mostCommon = missingTranslations
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        text: item.text,
        count: item.count,
        location: item.location
      }));
    
    // الاكتشافات الحديثة
    const recentDiscoveries = [...missingTranslations]
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, 10);
    
    return {
      totalMissingTranslations: missingTranslations.length,
      byLanguage,
      mostCommon,
      recentDiscoveries
    };
  }
  
  /**
   * بدء الإبلاغ الدوري عن النصوص غير المترجمة
   */
  public startPeriodicReporting(intervalMinutes = 60): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval as NodeJS.Timeout);
    }
    
    this.reportInterval = setInterval(() => {
      // إذا كانت هناك نصوص غير مترجمة، أنشئ تقريراً
      if (this.missingTranslationsCache.size > 0) {
        const report = this.generateReport();
        
        logger.info("TranslationMonitor", `تقرير دوري عن النصوص غير المترجمة`, {
          total: report.totalMissingTranslations,
          byLanguage: report.byLanguage,
          mostCommon: report.mostCommon.slice(0, 3) // أول ثلاثة فقط
        });
      }
    }, intervalMinutes * 60 * 1000) as unknown as NodeJS.Timer;
  }
  
  /**
   * تفعيل أو تعطيل المراقبة
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// تصدير مثيل واحد من خدمة المراقبة
export const translationMonitor = new TranslationMonitor();