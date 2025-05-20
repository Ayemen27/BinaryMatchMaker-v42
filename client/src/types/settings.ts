/**
 * أنواع البيانات لإعدادات المستخدم
 */

// إعدادات المستخدم العامة
export interface GeneralSettings {
  id?: number;
  userId?: number;
  theme: string;
  defaultAsset: string;
  defaultTimeframe: string;
  defaultPlatform: string;
  chartType: string;
  showTradingTips: boolean;
  autoRefreshData: boolean;
  refreshInterval: number;
  useAiForSignals?: boolean;
  useCustomAiKey?: boolean;
  openaiApiKey?: string;
  enableOtcTrading?: boolean;
  allowScheduledSignals?: boolean;
  respectTimeframes?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// إعدادات إشعارات المستخدم
export interface NotificationSettings {
  id?: number;
  userId?: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  signalAlerts: boolean;
  marketUpdates: boolean;
  accountAlerts: boolean;
  promotionalEmails: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// بيانات المستخدم الأساسية
export interface UserProfile {
  id?: number;
  username: string;
  email?: string;
  fullName?: string;
  language: string;
  subscriptionLevel?: string;
  subscriptionExpiry?: string;
  createdAt?: string;
  lastLogin?: string;
}

// كل إعدادات المستخدم مجمعة
export interface AllSettings {
  general?: GeneralSettings;
  notifications?: NotificationSettings;
  user?: UserProfile;
}