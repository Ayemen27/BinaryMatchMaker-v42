import { apiRequest, queryClient } from './queryClient';

// واجهة إعدادات المستخدم
export interface UserSettings {
  id?: number;
  userId?: number;
  theme: string;
  defaultAsset: string;
  defaultTimeframe: string;
  defaultPlatform?: string;
  chartType: string;
  showTradingTips: boolean;
  autoRefreshData: boolean;
  refreshInterval: number;
}

// الإعدادات الافتراضية
export const defaultSettings: UserSettings = {
  theme: 'dark',
  defaultAsset: 'BTC/USDT',
  defaultTimeframe: '1h',
  defaultPlatform: '',
  chartType: 'candlestick',
  showTradingTips: true,
  autoRefreshData: true,
  refreshInterval: 60,
};

// استرجاع إعدادات المستخدم
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const res = await fetch('/api/user/settings');
    if (!res.ok) {
      throw new Error('فشل جلب إعدادات المستخدم');
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('خطأ في استرجاع إعدادات المستخدم:', error);
    return defaultSettings;
  }
}

// تحديث إعدادات المستخدم
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  try {
    const res = await apiRequest('PATCH', '/api/user/settings', settings);
    if (!res.ok) {
      throw new Error('فشل تحديث إعدادات المستخدم');
    }
    
    // إعادة تحميل البيانات المخزنة مؤقتًا
    queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('خطأ في تحديث إعدادات المستخدم:', error);
    throw error;
  }
}

// تحديث إعداد محدد
export async function updateSingleSetting(key: keyof UserSettings, value: any): Promise<UserSettings> {
  try {
    // أولاً جلب الإعدادات الحالية
    const currentSettings = await getUserSettings();
    
    // تحديث الإعداد المطلوب
    const updatedSettings = {
      ...currentSettings,
      [key]: value
    };
    
    // حفظ الإعدادات المحدثة
    return await updateUserSettings(updatedSettings);
  } catch (error) {
    console.error(`خطأ في تحديث إعداد ${key}:`, error);
    throw error;
  }
}

// استخدام الميزات (hooks) للتعامل مع إعدادات المستخدم في مكونات React
export function useUserSettings() {
  return {
    getUserSettings,
    updateUserSettings,
    updateSingleSetting,
    defaultSettings
  };
}