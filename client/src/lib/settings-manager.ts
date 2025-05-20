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

  // محاولة استرجاع الإعدادات المخزنة محلياً
  const getLocalSettings = (): UserSettings | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedSettings = localStorage.getItem('userSettings');
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          console.log('تم استرجاع الإعدادات من التخزين المحلي:', parsedSettings);
          return parsedSettings;
        }
      }
    } catch (error) {
      console.error('خطأ أثناء استرجاع الإعدادات من التخزين المحلي:', error);
    }
    return null;
  };

  // الإعدادات المخزنة محلياً (إذا وجدت)
  const localSettings = getLocalSettings();

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

  // استخدام البيانات من الاستعلام أو الإعدادات المحلية أو القيم الافتراضية إذا كانت غير متاحة
  const settings = data || localSettings || defaultSettings;

  // تعريف mutation لتحديث الإعدادات
  const { mutate, isPending } = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      // طباعة البيانات المرسلة للتأكد من صحتها
      console.log('إرسال إعدادات للخادم:', newSettings);
      
      // تحضير الإعدادات المكتملة بدمج الإعدادات الحالية مع التغييرات الجديدة
      // هذا يضمن أن جميع الإعدادات يتم حفظها بشكل صحيح
      const completeSettings = {
        ...(data || localSettings || defaultSettings), // استخدام البيانات الحالية أو المحلية أو القيم الافتراضية
        ...newSettings // تطبيق التغييرات الجديدة فوق القيم الحالية
      };
      
      // طباعة الإعدادات المكتملة للتأكد من صحتها
      console.log('الإعدادات الكاملة التي سيتم إرسالها:', completeSettings);
      
      // حفظ الإعدادات الكاملة محليًا قبل الإرسال للخادم (احتياطي)
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('userSettings', JSON.stringify(completeSettings));
          console.log('تم حفظ الإعدادات الكاملة في التخزين المحلي');
        }
      } catch (error) {
        console.error('خطأ أثناء حفظ الإعدادات في التخزين المحلي:', error);
      }
      
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
      
      // تحديث بيانات الاستعلام في الذاكرة المؤقتة مع القيم الكاملة
      queryClient.setQueryData<UserSettings>([SETTINGS_KEY], (oldData) => {
        // نسخة احتياطية من البيانات القديمة
        const prevData = oldData || defaultSettings;
        
        // إنشاء كائن جديد يجمع بين البيانات السابقة والبيانات الجديدة
        const mergedData = { 
          ...prevData, // استخدام البيانات القديمة أولاً كأساس
          ...data,     // ثم تطبيق البيانات الجديدة من الخادم
        };
        
        // حفظ البيانات في محرك تخزين مرتبط بالمتصفح إذا كان متاحاً
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('userSettings', JSON.stringify(mergedData));
            console.log('تم حفظ الإعدادات المحدثة في التخزين المحلي');
          }
        } catch (error) {
          console.error('خطأ أثناء حفظ الإعدادات في التخزين المحلي:', error);
        }
        
        console.log('ذاكرة التخزين المؤقت المحدثة:', mergedData);
        return mergedData;
      });
      
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