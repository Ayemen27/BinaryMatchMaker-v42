/**
 * مدير إعدادات المستخدم - تنفيذ جديد أكثر بساطة وموثوقية
 * مع نظام تتبع متكامل لتشخيص المشاكل
 */

import { apiRequest, queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';
import tracker, { TrackEventType } from './debug-tracker';

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
          
          // تسجيل عملية قراءة التخزين المحلي في نظام التتبع
          tracker.trackEvent(TrackEventType.STORAGE_READ, {
            component: 'SettingsManager',
            action: 'getLocalSettings',
            data: parsedSettings,
            metadata: {
              source: 'localStorage',
              timestamp: new Date().toISOString()
            }
          });
          
          console.log('تم استرجاع الإعدادات من التخزين المحلي:', parsedSettings);
          return parsedSettings;
        }
      }
    } catch (error) {
      console.error('خطأ أثناء استرجاع الإعدادات من التخزين المحلي:', error);
      
      // تسجيل الخطأ في نظام التتبع
      tracker.trackEvent(TrackEventType.ERROR, {
        component: 'SettingsManager',
        action: 'getLocalSettings',
        data: { error: error instanceof Error ? error.message : String(error) },
        metadata: {
          source: 'localStorage',
          timestamp: new Date().toISOString()
        }
      });
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

  // تعريف مرجع للإعدادات الحالية للرجوع إليها في حالة حدوث مشاكل
  const currentSettingsRef = useRef<UserSettings | null>(null);
  
  // تحديث مرجع الإعدادات الحالية كلما تغيرت البيانات
  useEffect(() => {
    if (data) {
      currentSettingsRef.current = data;
      
      // تسجيل تحميل الإعدادات في نظام التتبع
      tracker.trackEvent(TrackEventType.SETTINGS_LOAD, {
        component: 'SettingsManager',
        action: 'loadServerSettings',
        data: data,
        metadata: {
          source: 'server',
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [data]);
  
  // تعريف mutation لتحديث الإعدادات
  const { mutate, isPending } = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      // تسجيل بدء عملية التحديث في نظام التتبع
      const eventId = tracker.trackEvent(TrackEventType.SETTINGS_CHANGE, {
        component: 'SettingsManager',
        action: 'updateSettingsStart',
        previousValue: currentSettingsRef.current || localSettings || defaultSettings,
        newValue: newSettings,
        metadata: {
          changedFields: Object.keys(newSettings),
          timestamp: new Date().toISOString()
        }
      });
      
      // طباعة البيانات المرسلة للتأكد من صحتها
      console.log('إرسال إعدادات للخادم:', newSettings);
      
      // تحضير الإعدادات المكتملة بدمج الإعدادات الحالية مع التغييرات الجديدة
      // هذا يضمن أن جميع الإعدادات يتم حفظها بشكل صحيح
      const baseSettings = data || localSettings || defaultSettings;
      
      const completeSettings = {
        ...baseSettings, // استخدام البيانات الحالية أو المحلية أو القيم الافتراضية
        ...newSettings // تطبيق التغييرات الجديدة فوق القيم الحالية
      };
      
      // طباعة الإعدادات المكتملة للتأكد من صحتها
      console.log('الإعدادات الكاملة التي سيتم إرسالها:', completeSettings);
      
      // تسجيل تفاصيل التغييرات المكتشفة في نظام التتبع
      const changes = tracker.detectChanges(baseSettings, completeSettings);
      tracker.trackEvent(TrackEventType.SETTINGS_SAVE, {
        component: 'SettingsManager',
        action: 'prepareSettingsForSave',
        data: changes,
        previousValue: baseSettings,
        newValue: completeSettings,
        metadata: {
          relatedEventId: eventId,
          timestamp: new Date().toISOString()
        }
      });
      
      // حفظ الإعدادات الكاملة محليًا قبل الإرسال للخادم (احتياطي)
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('userSettings', JSON.stringify(completeSettings));
          
          // تسجيل عملية كتابة التخزين المحلي في نظام التتبع
          tracker.trackEvent(TrackEventType.STORAGE_WRITE, {
            component: 'SettingsManager',
            action: 'saveToLocalStorage',
            data: completeSettings,
            metadata: {
              source: 'localStorage',
              timestamp: new Date().toISOString()
            }
          });
          
          console.log('تم حفظ الإعدادات الكاملة في التخزين المحلي');
        }
      } catch (error) {
        console.error('خطأ أثناء حفظ الإعدادات في التخزين المحلي:', error);
        
        // تسجيل الخطأ في نظام التتبع
        tracker.trackEvent(TrackEventType.ERROR, {
          component: 'SettingsManager',
          action: 'saveToLocalStorage',
          data: { error: error instanceof Error ? error.message : String(error) },
          metadata: {
            source: 'localStorage',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // تسجيل بدء الطلب للخادم
      tracker.trackEvent(TrackEventType.SERVER_REQUEST, {
        component: 'SettingsManager',
        action: 'sendToServer',
        data: newSettings,
        metadata: {
          url: SETTINGS_KEY,
          method: 'PATCH',
          timestamp: new Date().toISOString()
        }
      });
      
      const response = await apiRequest('PATCH', SETTINGS_KEY, newSettings);
      if (!response.ok) {
        const errorData = await response.json();
        
        // تسجيل خطأ الخادم في نظام التتبع
        tracker.trackEvent(TrackEventType.ERROR, {
          component: 'SettingsManager',
          action: 'serverResponseError',
          data: errorData,
          metadata: {
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          }
        });
        
        throw new Error(errorData.message || 'حدث خطأ أثناء حفظ الإعدادات');
      }
      
      const responseData = await response.json();
      
      // تسجيل استجابة الخادم في نظام التتبع
      tracker.trackEvent(TrackEventType.SERVER_RESPONSE, {
        component: 'SettingsManager',
        action: 'serverResponseSuccess',
        data: responseData,
        metadata: {
          status: response.status,
          timestamp: new Date().toISOString()
        }
      });
      
      return responseData;
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