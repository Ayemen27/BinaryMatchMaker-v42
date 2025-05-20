/**
 * مدير إعدادات المستخدم - تنفيذ جديد أكثر بساطة وموثوقية
 */

import { apiRequest, queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

// نوع بيانات إعدادات المستخدم
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
  openaiApiKey?: string;
}

// القيم الافتراضية للإعدادات
export const defaultSettings: UserSettings = {
  theme: 'light',
  defaultAsset: 'BTC/USDT',
  defaultTimeframe: '1h',
  defaultPlatform: '',
  chartType: 'candlestick',
  showTradingTips: true,
  autoRefreshData: true,
  refreshInterval: 60,
  useAiForSignals: true,
  useCustomAiKey: false,
};

// مفتاح استعلام إعدادات المستخدم
const SETTINGS_KEY = '/api/user/settings';

/**
 * هوك مدير إعدادات المستخدم
 * هذا الهوك يوفر واجهة بسيطة للحصول على إعدادات المستخدم وتحديثها
 */
export function useSettings() {
  const { toast } = useToast();

  // استعلام لجلب إعدادات المستخدم
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<UserSettings>({
    queryKey: [SETTINGS_KEY],
    refetchOnWindowFocus: true, // إعادة القراءة عند العودة للنافذة
    staleTime: 0, // دائماً اعتبر البيانات قديمة
    refetchOnMount: true, // إعادة القراءة عند إضافة المكون
  });

  // استخدام البيانات من الاستعلام أو القيم الافتراضية إذا كانت غير متاحة
  const settings = data || defaultSettings;

  // تعريف mutation لتحديث الإعدادات
  const { mutate, isPending } = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      // طباعة البيانات المرسلة للتأكد من صحتها
      console.log('إرسال إعدادات للخادم:', newSettings);
      
      const response = await apiRequest('PATCH', SETTINGS_KEY, newSettings);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'حدث خطأ أثناء حفظ الإعدادات');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // طباعة البيانات المستلمة للتأكد من صحتها
      console.log('تم استلام إعدادات محدثة من الخادم:', data);
      
      // تحديث بيانات الاستعلام في الذاكرة المؤقتة مع دمجها مع الإعدادات الحالية
      queryClient.setQueryData<UserSettings>([SETTINGS_KEY], (oldData) => {
        return { ...oldData, ...data };
      });
      
      // تطبيق الإعدادات المحدثة فوراً بدلاً من الانتظار للاستعلام من الخادم مرة أخرى
      
      // عرض رسالة نجاح
      toast({
        title: 'تم تحديث الإعدادات',
        description: 'تم حفظ الإعدادات بنجاح',
      });
    },
    onError: (error: Error) => {
      console.error('خطأ في تحديث الإعدادات:', error);
      
      // عرض رسالة خطأ
      toast({
        title: 'فشل تحديث الإعدادات',
        description: error.message || 'حدث خطأ أثناء حفظ الإعدادات',
        variant: 'destructive',
      });
    },
  });

  // دالة لتحديث إعداد واحد
  const updateSetting = useCallback((key: keyof UserSettings, value: any) => {
    mutate({ [key]: value });
  }, [mutate]);

  // دالة لتحديث مجموعة إعدادات دفعة واحدة
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    mutate(newSettings);
  }, [mutate]);

  return {
    // البيانات
    settings,
    defaultSettings,
    
    // الحالة
    isLoading,
    error,
    isSaving: isPending,
    
    // الوظائف
    updateSetting,
    updateSettings,
    refetch,
  };
}