/**
 * وسيط (middleware) لمراقبة الترجمات في رسائل API
 * 
 * يراقب هذا الوسيط البيانات المرسلة من الخادم إلى العميل
 * ويبحث عن النصوص التي قد تكون غير مترجمة
 */

import { Request, Response, NextFunction } from 'express';
import { translationMonitor } from '../services/translation-monitor';
import { SupportedLanguages } from '../i18n/translations';
import { storage } from '../storage';

/**
 * وسيط مراقبة الترجمات في API
 * يحلل البيانات المرسلة ويبحث عن محتوى يجب ترجمته
 */
export async function translationMonitorMiddleware(req: Request, res: Response, next: NextFunction) {
  // الاحتفاظ بالوظيفة الأصلية json
  const originalJson = res.json;
  
  // استبدال وظيفة json
  res.json = function(body: any) {
    try {
      // الاستمرار فقط إذا كان المستخدم مسجل الدخول
      if (req.isAuthenticated() && req.user) {
        // محاولة الحصول على لغة المستخدم
        checkUserLanguage(req).then(userLanguage => {
          // فحص البيانات المرسلة بحثًا عن نصوص غير مترجمة
          scanResponseForUntranslatedStrings(body, userLanguage, req.path);
        }).catch(() => {
          // لا شيء في حالة حدوث خطأ
        });
      }
    } catch (error) {
      // تجاهل أي أخطاء للتأكد من عدم تعطيل استجابة API
    }
    
    // استدعاء الوظيفة الأصلية
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * الحصول على لغة المستخدم المفضلة
 */
async function checkUserLanguage(req: Request): Promise<SupportedLanguages> {
  if (!req.user?.id) {
    return 'ar'; // اللغة الافتراضية
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    if (user && user.language) {
      return (user.language === 'en' ? 'en' : 'ar') as SupportedLanguages;
    }
  } catch {
    // في حالة الخطأ، استخدم اللغة الافتراضية
  }
  
  return 'ar';
}

/**
 * مسح الاستجابة بحثًا عن سلاسل نصية غير مترجمة
 */
function scanResponseForUntranslatedStrings(data: any, expectedLanguage: SupportedLanguages, location: string): void {
  // تجاهل البيانات الفارغة
  if (!data) return;
  
  // المجالات التي يجب البحث فيها عن ترجمات
  const textFields = [
    'message', 'error', 'title', 'description', 'name',
    'label', 'text', 'content', 'reason', 'solution'
  ];
  
  // البحث في الكائنات
  if (typeof data === 'object' && data !== null) {
    // إذا كان مصفوفة
    if (Array.isArray(data)) {
      // مرر عبر كل عنصر في المصفوفة
      data.forEach((item, index) => {
        scanResponseForUntranslatedStrings(
          item, 
          expectedLanguage, 
          `${location}[${index}]`
        );
      });
    } else {
      // فحص كل خاصية في الكائن
      for (const key of Object.keys(data)) {
        // إذا كانت الخاصية نصية وفي قائمة الحقول المراد فحصها
        if (typeof data[key] === 'string' && textFields.includes(key.toLowerCase())) {
          translationMonitor.reportMissingTranslation(
            data[key],
            expectedLanguage,
            `${location}.${key}`,
            (req as any).user?.id
          );
        }
        
        // فحص الكائنات المتداخلة
        if (typeof data[key] === 'object' && data[key] !== null) {
          scanResponseForUntranslatedStrings(
            data[key], 
            expectedLanguage, 
            `${location}.${key}`
          );
        }
      }
    }
  }
}