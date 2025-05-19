// تعريفات الأنواع للاستخدام في التطبيق

// نوع بيانات الإشارة
export interface Signal {
  id: number;
  asset: string;
  type: 'buy' | 'sell';
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  accuracy: number;
  time: string;
  status: 'active' | 'completed';
  indicators: string[];
  platform?: string;
  timeframe?: string;
  analysis?: {
    reasoning?: string;
    potentialProfit?: string;
    riskRewardRatio?: string;
    timestamp?: string;
    [key: string]: any;
  }; // بيانات التحليل الإضافية
  reason?: string; // سبب الإشارة
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date | null;
  result?: 'success' | 'failure' | null;
  createdBy?: number | null;
  isPublic?: boolean;
}

// نوع بيانات المستخدم
export interface User {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  subscriptionLevel: string;
  subscriptionExpiry?: Date;
  language: string;
  createdAt: Date;
  lastLogin?: Date;
  avatar?: string;
  phoneNumber?: string;
  isActive: boolean;
}

// نوع بيانات إعدادات المستخدم
export interface UserSettings {
  id: number;
  userId: number;
  theme: string;
  defaultAsset: string;
  defaultTimeframe: string;
  defaultPlatform?: string;
  chartType: string;
  showTradingTips: boolean;
  autoRefreshData: boolean;
  refreshInterval: number;
  useAiForSignals: boolean;
  useCustomAiKey: boolean;
  openaiApiKey?: string | null;
  // إعدادات توليد الإشارات الإضافية
  enableOtcTrading?: boolean; // تفعيل التداول خارج السوق
  allowScheduledSignals?: boolean; // السماح بجدولة الإشارات عندما يكون السوق مغلق
  respectTimeframes?: boolean; // احترام الإطار الزمني عند توليد إشارات جديدة
  lastSignalTime?: Date | null; // وقت آخر إشارة تم توليدها
  preferredPlatforms?: string[]; // المنصات المفضلة
  preferredPairs?: string[]; // الأزواج المفضلة
  preferredTimeframes?: string[]; // الأطر الزمنية المفضلة
  signalHistory?: any; // تاريخ الإشارات الأخيرة المولدة
  createdAt: Date;
  updatedAt: Date;
}

// نوع بيانات إشعارات المستخدم
export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  relatedId?: number;
  createdAt: Date;
}

// نوع بيانات إعدادات الإشعارات للمستخدم
export interface UserNotificationSettings {
  id: number;
  userId: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  signalAlerts: boolean;
  marketUpdates: boolean;
  accountAlerts: boolean;
  promotionalEmails: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// نوع بيانات بيانات السوق
export interface MarketData {
  id: number;
  asset: string;
  price: string;
  change24h?: string;
  high24h?: string;
  low24h?: string;
  volume24h?: string;
  marketCap?: string;
  timestamp: Date;
  dataSource?: string;
}