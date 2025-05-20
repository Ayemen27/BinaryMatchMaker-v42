/**
 * أنواع بيانات الإعدادات الموحدة
 */

// ملف شخصي المستخدم
export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  language: string;
  subscriptionLevel?: string;
  subscriptionExpiry?: string | Date;
  avatar?: string;
  lastLogin?: string | Date;
}

// الإعدادات العامة
export interface GeneralSettings {
  theme: string;
  defaultAsset: string;
  defaultTimeframe: string;
  defaultPlatform?: string;
  chartType: string;
  showTradingTips: boolean;
  autoRefreshData: boolean;
  refreshInterval: number;
  // إعدادات API
  useAiForSignals?: boolean;
  useCustomAiKey?: boolean;
  openaiApiKey?: string;
  // إعدادات إضافية
  enableOtcTrading?: boolean;
  allowScheduledSignals?: boolean;
  respectTimeframes?: boolean;
  preferredPlatforms?: string[];
  preferredPairs?: string[];
  preferredTimeframes?: string[];
}

// إعدادات الإشعارات
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  signalAlerts: boolean;
  marketUpdates: boolean;
  accountAlerts: boolean;
  promotionalEmails: boolean;
}

// جميع الإعدادات
export interface AllSettings {
  user?: UserProfile | null;
  general?: GeneralSettings | null;
  notifications?: NotificationSettings | null;
}

// أنواع بيانات نموذج الإعدادات للعرض
export interface SettingsFormData {
  profileSettings: {
    username: string;
    email: string;
    fullName: string;
    language: string;
  };
  generalSettings: {
    theme: string;
    defaultAsset: string;
    defaultTimeframe: string;
    defaultPlatform: string;
    chartType: string;
    showTradingTips: boolean;
    autoRefreshData: boolean;
    refreshInterval: number;
  };
  notificationSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    signalAlerts: boolean;
    marketUpdates: boolean;
    accountAlerts: boolean;
    promotionalEmails: boolean;
  };
  apiSettings: {
    useAiForSignals: boolean;
    useCustomAiKey: boolean;
    openaiApiKey: string;
  };
}