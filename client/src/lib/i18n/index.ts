/**
 * تكوين نظام الترجمة i18n للمشروع
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// استيراد ملفات الترجمة العربية
import arSettingsTranslation from "./translations/ar-settings.json";

// استيراد ملفات الترجمة الإنجليزية
import enSettingsTranslation from "./translations/en-settings.json";

// استيراد ترجمات من الملفات الموجودة سابقاً (إذا وجدت)
// import existingARTranslations from "..."; 
// import existingENTranslations from "...";

// دمج ملفات الترجمة
const resources = {
  ar: {
    translation: {
      // ترجمات الإعدادات
      ...arSettingsTranslation,
      
      // إضافة ترجمات أخرى إذا وجدت
      // ...existingARTranslations
    }
  },
  en: {
    translation: {
      // ترجمات الإعدادات
      ...enSettingsTranslation,
      
      // إضافة ترجمات أخرى إذا وجدت
      // ...existingENTranslations
    }
  }
};

i18n
  .use(initReactI18next) // تفعيل معالج React
  .init({
    resources,
    lng: localStorage.getItem("language") || "ar", // اللغة الافتراضية
    fallbackLng: "ar", // اللغة الاحتياطية
    
    interpolation: {
      escapeValue: false // عدم هروب من HTML
    },
    
    react: {
      useSuspense: false // لمنع مشاكل التحميل المعلق
    }
  });

export default i18n;