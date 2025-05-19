import { apiRequest, queryClient } from './queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  useAiForSignals?: boolean;
  useCustomAiKey?: boolean;
  hasCustomApiKey?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  useAiForSignals: true,
  useCustomAiKey: false
};

// ثابت لاسم مفتاح الاستعلام
const SETTINGS_QUERY_KEY = '/api/user/settings';

/**
 * هذا الهوك هو الطريقة المفضلة للتعامل مع إعدادات المستخدم
 * يوفر وظائف لقراءة وكتابة الإعدادات وإدارة حالة التحميل والأخطاء
 */
export function useUserSettings() {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<UserSettings>(defaultSettings);
  
  // استعلام لجلب إعدادات المستخدم
  const {
    data: settings,
    isLoading,
    error,
    refetch
  } = useQuery<UserSettings>({
    queryKey: [SETTINGS_QUERY_KEY],
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // عندما تتغير البيانات من الخادم، نحدث الإعدادات المحلية
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);
  
  // mutation لتحديث الإعدادات على الخادم
  const mutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const response = await apiRequest('PATCH', SETTINGS_QUERY_KEY, newSettings);
      return response.json();
    },
    onSuccess: (data) => {
      // تحديث بيانات الاستعلام وحالة الإعدادات المحلية
      queryClient.setQueryData([SETTINGS_QUERY_KEY], data);
      setLocalSettings(prev => ({ ...prev, ...data }));
      
      // إظهار رسالة نجاح
      toast({
        title: 'تم تحديث الإعدادات',
        description: 'تم حفظ الإعدادات بنجاح في قاعدة البيانات',
      });
    },
    onError: (error: Error) => {
      console.error('خطأ في تحديث الإعدادات:', error);
      toast({
        title: 'فشل تحديث الإعدادات',
        description: error.message || 'حدث خطأ أثناء محاولة حفظ الإعدادات',
        variant: 'destructive',
      });
    },
  });
  
  // دالة لتحديث إعداد واحد
  const updateSetting = useCallback((key: keyof UserSettings, value: any) => {
    // تحديث الإعدادات المحلية فوراً للاستجابة السريعة في واجهة المستخدم
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    
    // إرسال التغيير إلى الخادم
    mutation.mutate({ [key]: value });
  }, [mutation]);
  
  // دالة لتحديث عدة إعدادات مرة واحدة
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    // تحديث الإعدادات المحلية فوراً
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
    
    // إرسال التغييرات إلى الخادم
    mutation.mutate(newSettings);
  }, [mutation]);
  
  // دالة لإعادة تعيين الإعدادات إلى القيم الافتراضية
  const resetToDefaults = useCallback(() => {
    updateSettings(defaultSettings);
  }, [updateSettings]);
  
  // إعادة قراءة البيانات من الخادم بشكل صريح
  const refreshSettings = useCallback(() => {
    return refetch();
  }, [refetch]);
  
  return {
    // البيانات الأساسية
    settings: localSettings,
    defaultSettings,
    
    // حالة البيانات
    isLoading,
    error,
    isSaving: mutation.isPending,
    
    // وظائف التحديث
    updateSetting,
    updateSettings,
    resetToDefaults,
    refreshSettings
  };
}