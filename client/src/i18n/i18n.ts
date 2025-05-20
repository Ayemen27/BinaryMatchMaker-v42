/**
 * إعداد نظام الترجمة i18n
 * للتعامل مع اللغات المتعددة في التطبيق
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// استيراد ملفات الترجمة
import translationAR from './ar.json';
import translationEN from './en.json';

// موارد الترجمة الافتراضية
const resources = {
  ar: {
    translation: translationAR
  },
  en: {
    translation: translationEN
  }
};

i18n
  // تهيئة i18next مع React
  .use(initReactI18next)
  // تهيئة i18next
  .init({
    resources,
    lng: 'ar', // اللغة الافتراضية
    fallbackLng: 'ar', // اللغة الاحتياطية إذا لم يتم العثور على مفتاح
    
    interpolation: {
      escapeValue: false // عدم استخدام الهروب من HTML
    },
    
    // خيارات إضافية
    debug: process.env.NODE_ENV === 'development',
    
    // تفعيل تعدد اللغات في كل المكونات
    react: {
      useSuspense: false,
    }
  });

export default i18n;