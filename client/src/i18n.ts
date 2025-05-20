/**
 * تكوين نظام الترجمة i18n الرئيسي
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// استيراد ملفات الترجمة الأساسية
import arTranslation from "./i18n/ar.json";
import enTranslation from "./i18n/en.json";

// استيراد إضافات الترجمة (من المكونات المضافة حديثًا)
import arSettingsTranslation from "./lib/i18n/translations/ar-settings.json";
import enSettingsTranslation from "./lib/i18n/translations/en-settings.json";

// دمج ملفات الترجمة
const resources = {
  ar: {
    translation: {
      // الترجمات الأساسية
      ...arTranslation,
      
      // إضافة ترجمات الإعدادات الجديدة
      ...arSettingsTranslation
    }
  },
  en: {
    translation: {
      // الترجمات الأساسية
      ...enTranslation,
      
      // إضافة ترجمات الإعدادات الجديدة
      ...enSettingsTranslation
    }
  }
};

// إضافة الترجمات المباشرة للكلمات المهمة
const directTranslations = {
  ar: {
    settings: "الإعدادات",
    settingsDescription: "تخصيص إعدادات حسابك وتفضيلاتك",
    settingsTip: "يمكنك تخصيص جميع جوانب تجربتك في منصة Binarjoin Analytics. تأكد من حفظ التغييرات بعد الانتهاء.",
    profile: "الملف الشخصي",
    languageSettings: "إعدادات اللغة",
    chooseLanguage: "اختر لغة التطبيق",
    selectLanguage: "اختر اللغة",
    usageStats: "إحصائيات الاستخدام",
    last30Days: "آخر 30 يوم",
    accountInfo: "معلومات الحساب",
    generalSettings: "الإعدادات العامة",
    notificationSettings: "إعدادات الإشعارات",
    apiSettings: "إعدادات API"
  },
  en: {
    settings: "Settings",
    settingsDescription: "Customize your account settings and preferences",
    settingsTip: "You can customize all aspects of your experience in Binarjoin Analytics. Make sure to save changes when you're done.",
    profile: "Profile",
    languageSettings: "Language Settings",
    chooseLanguage: "Choose application language",
    selectLanguage: "Select language",
    usageStats: "Usage Statistics",
    last30Days: "Last 30 Days",
    accountInfo: "Account Info",
    generalSettings: "General Settings",
    notificationSettings: "Notification Settings",
    apiSettings: "API Settings"
  }
};

// دمج الترجمات المباشرة مع الترجمات الأخرى
resources.ar.translation = { ...resources.ar.translation, ...directTranslations.ar };
resources.en.translation = { ...resources.en.translation, ...directTranslations.en };

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