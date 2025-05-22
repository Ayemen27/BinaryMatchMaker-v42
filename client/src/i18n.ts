/**
 * تكوين نظام الترجمة i18n الرئيسي
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// استيراد ملفات الترجمة الموحدة
import arTranslation from "./i18n/ar.json";
import enTranslation from "./i18n/en.json";

// تعريف موارد الترجمة
const resources = {
  ar: {
    translation: arTranslation
  },
  en: {
    translation: enTranslation
  }
};

// كل الترجمات المطلوبة موجودة الآن في ملفات الترجمة الموحدة

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("language") || "ar", // اللغة الافتراضية
    fallbackLng: "ar", // اللغة الاحتياطية
    
    interpolation: {
      escapeValue: false // عدم هروب من HTML
    },
    
    react: {
      useSuspense: false // لمنع مشاكل التحميل المعلق
    },
    
    // تفعيل إتجاه النص عند التغيير
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// ضبط اتجاه الصفحة حسب اللغة الحالية
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

// الاستماع لتغييرات اللغة لتحديث اتجاه الصفحة
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  
  // حفظ اللغة المفضلة في التخزين المحلي
  localStorage.setItem('language', lng);
});

export default i18n;