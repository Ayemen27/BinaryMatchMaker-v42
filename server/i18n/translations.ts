/**
 * نظام الترجمة متعدد اللغات
 * يدعم تخزين وإدارة جميع النصوص والرسائل والأزرار في التطبيق
 */

// أنواع الترجمات المدعومة
export type SupportedLanguages = 'ar' | 'en';

// هيكل الترجمات
export interface TranslationDictionary {
  [key: string]: {
    [lang in SupportedLanguages]?: string;
  };
}

// الترجمات حسب القسم
export interface Translations {
  errors: TranslationDictionary;
  ui: TranslationDictionary;
  buttons: TranslationDictionary;
  notifications: TranslationDictionary;
  signals: TranslationDictionary;
  auth: TranslationDictionary;
}

// ترجمات الأخطاء
const errors: TranslationDictionary = {
  'quota_exceeded': {
    ar: 'تم تجاوز الحد المسموح لاستخدام الذكاء الاصطناعي',
    en: 'AI usage quota has been exceeded'
  },
  'invalid_api_key': {
    ar: 'مفتاح API غير صالح أو منتهي الصلاحية',
    en: 'Invalid or expired API key'
  },
  'rate_limit': {
    ar: 'تم تجاوز الحد الأقصى لعدد الطلبات المسموح بها',
    en: 'Maximum request rate limit has been exceeded'
  },
  'service_unavailable': {
    ar: 'الخدمة غير متاحة حاليًا',
    en: 'Service is currently unavailable'
  },
  'generic_error': {
    ar: 'حدث خطأ غير متوقع',
    en: 'An unexpected error occurred'
  },
  'unauthorized': {
    ar: 'غير مصرح. يرجى تسجيل الدخول',
    en: 'Unauthorized. Please log in'
  },
  'invalid_data': {
    ar: 'بيانات غير صالحة',
    en: 'Invalid data'
  },
  'daily_limit': {
    ar: 'تم تجاوز الحد اليومي',
    en: 'Daily limit exceeded'
  },
  'database_error': {
    ar: 'حدث خطأ في قاعدة البيانات',
    en: 'A database error occurred'
  }
};

// ترجمات واجهة المستخدم
const ui: TranslationDictionary = {
  'dashboard_title': {
    ar: 'لوحة التحكم',
    en: 'Dashboard'
  },
  'signals_title': {
    ar: 'الإشارات',
    en: 'Signals'
  },
  'settings_title': {
    ar: 'الإعدادات',
    en: 'Settings'
  },
  'profile_title': {
    ar: 'الملف الشخصي',
    en: 'Profile'
  },
  'notification_title': {
    ar: 'الإشعارات',
    en: 'Notifications'
  },
  'language_settings': {
    ar: 'إعدادات اللغة',
    en: 'Language Settings'
  },
  'theme_settings': {
    ar: 'إعدادات المظهر',
    en: 'Theme Settings'
  },
  'ai_settings': {
    ar: 'إعدادات الذكاء الاصطناعي',
    en: 'AI Settings'
  },
  'subscription_settings': {
    ar: 'إعدادات الاشتراك',
    en: 'Subscription Settings'
  },
  'loading': {
    ar: 'جاري التحميل...',
    en: 'Loading...'
  },
  'no_data': {
    ar: 'لا توجد بيانات',
    en: 'No data available'
  },
  'welcome_message': {
    ar: 'مرحبًا بك في منصة إشارات التداول',
    en: 'Welcome to the Trading Signals Platform'
  },
  // إضافة ترجمات جديدة لصفحة الإعدادات
  'languageSettingsDescription': {
    ar: 'اختر لغة واجهة المستخدم والإشعارات',
    en: 'Choose your interface and notification language'
  },
  'languageInfoMessage': {
    ar: 'اختيار اللغة سيؤثر على واجهة المستخدم والإشعارات والرسائل.',
    en: 'Language selection will affect the user interface, notifications, and messages.'
  },
  'currentLanguage': {
    ar: 'اللغة الحالية',
    en: 'Current Language'
  },
  'active': {
    ar: 'نشط',
    en: 'Active'
  },
  'profileSettings': {
    ar: 'إعدادات الملف الشخصي',
    en: 'Profile Settings'
  },
  'profileSettingsDescription': {
    ar: 'إدارة معلومات الملف الشخصي والحساب',
    en: 'Manage your profile and account information'
  },
  'fullName': {
    ar: 'الاسم الكامل',
    en: 'Full Name'
  },
  'username': {
    ar: 'اسم المستخدم',
    en: 'Username'
  },
  'email': {
    ar: 'البريد الإلكتروني',
    en: 'Email'
  },
  'changePassword': {
    ar: 'تغيير كلمة المرور',
    en: 'Change Password'
  },
  'currentPassword': {
    ar: 'كلمة المرور الحالية',
    en: 'Current Password'
  },
  'newPassword': {
    ar: 'كلمة المرور الجديدة',
    en: 'New Password'
  },
  'confirmPassword': {
    ar: 'تأكيد كلمة المرور',
    en: 'Confirm Password'
  },
  'phoneNumber': {
    ar: 'رقم الهاتف',
    en: 'Phone Number'
  },
  'country': {
    ar: 'الدولة',
    en: 'Country'
  },
  'notificationSettings': {
    ar: 'إعدادات الإشعارات',
    en: 'Notification Settings'
  },
  'notificationSettingsDescription': {
    ar: 'تخصيص طريقة استلام الإشعارات والتنبيهات',
    en: 'Customize how you receive notifications and alerts'
  },
  'emailNotifications': {
    ar: 'إشعارات البريد الإلكتروني',
    en: 'Email Notifications'
  },
  'pushNotifications': {
    ar: 'الإشعارات الفورية',
    en: 'Push Notifications'
  },
  'signalAlerts': {
    ar: 'تنبيهات الإشارات',
    en: 'Signal Alerts'
  },
  'marketUpdates': {
    ar: 'تحديثات السوق',
    en: 'Market Updates'
  },
  'accountAlerts': {
    ar: 'تنبيهات الحساب',
    en: 'Account Alerts'
  },
  'tradePerformance': {
    ar: 'أداء التداول',
    en: 'Trade Performance'
  },
  'subscriptionTab': {
    ar: 'الاشتراك',
    en: 'Subscription'
  },
  'currentPlan': {
    ar: 'الخطة الحالية',
    en: 'Current Plan'
  },
  'freeSubscription': {
    ar: 'اشتراك مجاني',
    en: 'Free Subscription'
  },
  'remainingSignals': {
    ar: 'الإشارات المتبقية: {{count}}',
    en: 'Remaining Signals: {{count}}'
  },
  'limitedSignals': {
    ar: 'إشارات محدودة ({{count}} شهرياً)',
    en: 'Limited Signals ({{count}} monthly)'
  },
  'basicMarketAnalysis': {
    ar: 'تحليل سوق أساسي',
    en: 'Basic Market Analysis'
  },
  'upgradePlan': {
    ar: 'ترقية الخطة',
    en: 'Upgrade Plan'
  },
  'billingInformation': {
    ar: 'معلومات الفواتير',
    en: 'Billing Information'
  },
  'noBillingInformation': {
    ar: 'لا توجد معلومات فواتير مسجلة',
    en: 'No billing information on record'
  },
  'paymentHistory': {
    ar: 'سجل المدفوعات',
    en: 'Payment History'
  },
  'noPaymentHistory': {
    ar: 'لا يوجد سجل مدفوعات',
    en: 'No payment history'
  }
};

// ترجمات الأزرار
const buttons: TranslationDictionary = {
  'login': {
    ar: 'تسجيل الدخول',
    en: 'Login'
  },
  'signup': {
    ar: 'إنشاء حساب',
    en: 'Sign Up'
  },
  'logout': {
    ar: 'تسجيل الخروج',
    en: 'Logout'
  },
  'save': {
    ar: 'حفظ',
    en: 'Save'
  },
  'cancel': {
    ar: 'إلغاء',
    en: 'Cancel'
  },
  'generate': {
    ar: 'توليد',
    en: 'Generate'
  },
  'analyze': {
    ar: 'تحليل',
    en: 'Analyze'
  },
  'confirm': {
    ar: 'تأكيد',
    en: 'Confirm'
  },
  'back': {
    ar: 'رجوع',
    en: 'Back'
  },
  'next': {
    ar: 'التالي',
    en: 'Next'
  },
  'submit': {
    ar: 'إرسال',
    en: 'Submit'
  },
  'try_again': {
    ar: 'حاول مرة أخرى',
    en: 'Try Again'
  },
  'use_ai': {
    ar: 'استخدام الذكاء الاصطناعي',
    en: 'Use AI'
  },
  'use_algorithms': {
    ar: 'استخدام الخوارزميات التقليدية',
    en: 'Use Traditional Algorithms'
  },
  'update_profile': {
    ar: 'تحديث الملف الشخصي',
    en: 'Update Profile'
  },
  'change_password': {
    ar: 'تغيير كلمة المرور',
    en: 'Change Password'
  },
  'save_changes': {
    ar: 'حفظ التغييرات',
    en: 'Save Changes'
  },
  'update_settings': {
    ar: 'تحديث الإعدادات',
    en: 'Update Settings'
  },
  'update_notifications': {
    ar: 'تحديث الإشعارات',
    en: 'Update Notifications'
  },
  'update_ai_settings': {
    ar: 'تحديث إعدادات الذكاء الاصطناعي',
    en: 'Update AI Settings'
  },
  'update_language': {
    ar: 'تحديث اللغة',
    en: 'Update Language'
  },
  'apply': {
    ar: 'تطبيق',
    en: 'Apply'
  },
  'reset': {
    ar: 'إعادة ضبط',
    en: 'Reset'
  }
};

// ترجمات الإشعارات
const notifications: TranslationDictionary = {
  'success': {
    ar: 'تمت العملية بنجاح',
    en: 'Operation successful'
  },
  'error': {
    ar: 'حدث خطأ',
    en: 'An error occurred'
  },
  'warning': {
    ar: 'تحذير',
    en: 'Warning'
  },
  'info': {
    ar: 'معلومات',
    en: 'Information'
  },
  'new_signal': {
    ar: 'تم إنشاء إشارة جديدة',
    en: 'New signal created'
  },
  'signal_updated': {
    ar: 'تم تحديث الإشارة',
    en: 'Signal updated'
  },
  'settings_saved': {
    ar: 'تم حفظ الإعدادات',
    en: 'Settings saved'
  },
  'subscription_updated': {
    ar: 'تم تحديث الاشتراك',
    en: 'Subscription updated'
  }
};

// ترجمات الإشارات
const signals: TranslationDictionary = {
  'buy_signal': {
    ar: 'إشارة شراء',
    en: 'Buy Signal'
  },
  'sell_signal': {
    ar: 'إشارة بيع',
    en: 'Sell Signal'
  },
  'entry_price': {
    ar: 'سعر الدخول',
    en: 'Entry Price'
  },
  'target_price': {
    ar: 'السعر المستهدف',
    en: 'Target Price'
  },
  'stop_loss': {
    ar: 'وقف الخسارة',
    en: 'Stop Loss'
  },
  'accuracy': {
    ar: 'الدقة',
    en: 'Accuracy'
  },
  'timeframe': {
    ar: 'الإطار الزمني',
    en: 'Timeframe'
  },
  'platform': {
    ar: 'المنصة',
    en: 'Platform'
  },
  'asset': {
    ar: 'الأصل',
    en: 'Asset'
  },
  'generated_by': {
    ar: 'تم التوليد بواسطة',
    en: 'Generated by'
  },
  'ai_generated': {
    ar: 'تم التوليد بواسطة الذكاء الاصطناعي',
    en: 'AI Generated'
  },
  'algorithm_generated': {
    ar: 'تم التوليد بواسطة الخوارزميات التقليدية',
    en: 'Algorithm Generated'
  }
};

// ترجمات المصادقة
const auth: TranslationDictionary = {
  'username': {
    ar: 'اسم المستخدم',
    en: 'Username'
  },
  'password': {
    ar: 'كلمة المرور',
    en: 'Password'
  },
  'remember_me': {
    ar: 'تذكرني',
    en: 'Remember me'
  },
  'forgot_password': {
    ar: 'نسيت كلمة المرور',
    en: 'Forgot password'
  },
  'login_failed': {
    ar: 'فشل تسجيل الدخول',
    en: 'Login failed'
  },
  'login_success': {
    ar: 'تم تسجيل الدخول بنجاح',
    en: 'Login successful'
  },
  'register_success': {
    ar: 'تم التسجيل بنجاح',
    en: 'Registration successful'
  },
  'confirm_password': {
    ar: 'تأكيد كلمة المرور',
    en: 'Confirm password'
  },
  'email': {
    ar: 'البريد الإلكتروني',
    en: 'Email'
  }
};

// تجميع كل الترجمات
export const translations: Translations = {
  errors,
  ui,
  buttons,
  notifications,
  signals,
  auth
};

/**
 * وظيفة للحصول على ترجمة نص معين
 * @param section القسم (errors, ui, buttons, ...)
 * @param key مفتاح النص
 * @param language رمز اللغة (ar, en)
 * @param defaultLanguage اللغة الافتراضية إذا لم تكن الترجمة متوفرة
 * @returns النص المترجم
 */
export function translate(
  section: keyof Translations,
  key: string,
  language: SupportedLanguages = 'ar',
  defaultLanguage: SupportedLanguages = 'ar'
): string {
  // التحقق من وجود القسم
  if (!translations[section]) {
    return key;
  }
  
  // التحقق من وجود المفتاح في القسم
  if (!translations[section][key]) {
    return key;
  }
  
  // الحصول على الترجمة باللغة المطلوبة
  const translation = translations[section][key][language];
  
  // إذا كانت الترجمة غير متوفرة، استخدم اللغة الافتراضية
  if (!translation) {
    return translations[section][key][defaultLanguage] || key;
  }
  
  return translation;
}

/**
 * وظيفة للحصول على ترجمة رسالة خطأ
 * @param key مفتاح الخطأ
 * @param language رمز اللغة
 * @returns رسالة الخطأ المترجمة
 */
export function translateError(key: string, language: SupportedLanguages = 'ar'): string {
  return translate('errors', key, language);
}

/**
 * وظيفة للحصول على ترجمة عنصر واجهة
 * @param key مفتاح عنصر الواجهة
 * @param language رمز اللغة
 * @returns نص عنصر الواجهة المترجم
 */
export function translateUI(key: string, language: SupportedLanguages = 'ar'): string {
  return translate('ui', key, language);
}

/**
 * وظيفة للحصول على ترجمة زر
 * @param key مفتاح الزر
 * @param language رمز اللغة
 * @returns نص الزر المترجم
 */
export function translateButton(key: string, language: SupportedLanguages = 'ar'): string {
  return translate('buttons', key, language);
}

/**
 * وظيفة للحصول على رسالة خطأ كاملة متعلقة بالذكاء الاصطناعي مع اقتراح للحل
 * @param errorType نوع الخطأ
 * @param language رمز اللغة
 * @returns كائن به رسالة الخطأ والحل
 */
export function getAIErrorMessage(errorType: string, language: SupportedLanguages = 'ar'): {
  error: string;
  message: string;
  solution: string;
} {
  let errorKey = 'generic_error';
  
  // تحديد مفتاح الخطأ المناسب
  if (errorType.includes('quota') || errorType.includes('exceeded')) {
    errorKey = 'quota_exceeded';
  } else if (errorType.includes('invalid') || errorType.includes('key')) {
    errorKey = 'invalid_api_key';
  } else if (errorType.includes('rate') || errorType.includes('limit')) {
    errorKey = 'rate_limit';
  } else if (errorType.includes('unavailable') || errorType.includes('service')) {
    errorKey = 'service_unavailable';
  }
  
  // إنشاء رسالة الخطأ مع حل مقترح
  return {
    error: translateError(errorKey, language),
    message: translate('errors', errorKey, language),
    solution: language === 'ar' 
      ? 'يمكنك تعطيل خيار الذكاء الاصطناعي واستخدام الخوارزميات التقليدية بدلاً من ذلك.' 
      : 'You can disable the AI option and use traditional algorithms instead.'
  };
}