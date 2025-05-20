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
  _updated?: string;  // حقل لتتبع وقت آخر تحديث (غير مخزن في قاعدة البيانات)
  _serverTime?: string; // وقت استجابة الخادم
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
      // طباعة البيانات المرسلة للتأكد من صحتها
      console.log('⚙️ [إعدادات] إرسال إعدادات للخادم:', newSettings);
      
      // تجهيز قيمة فريدة لتوقيت التحديث
      const updateTimestamp = new Date().toISOString();
      
      // تحضير الإعدادات المكتملة بدمج الإعدادات الحالية مع التغييرات الجديدة
      // استخدام القيم الافتراضية فقط إذا لم تكن هناك بيانات مخزنة
      let baseSettings: UserSettings;

      // محاولة استرجاع البيانات بترتيب الأولوية:
      // 1. الإعدادات المخزنة محليًا (لضمان وجود آخر تحديثات المستخدم)
      // 2. الإعدادات المستردة من الخادم
      // 3. القيم الافتراضية كملجأ أخير
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedSettings = localStorage.getItem('userSettings');
          if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            console.log('📋 [إعدادات] تم استخدام إعدادات التخزين المحلي:', parsedSettings);
            baseSettings = parsedSettings;
          } else if (data) {
            console.log('📋 [إعدادات] تم استخدام إعدادات الخادم:', data);
            baseSettings = { ...data };
          } else {
            console.log('📋 [إعدادات] تم استخدام الإعدادات الافتراضية:', defaultSettings);
            baseSettings = { ...defaultSettings };
          }
        } else if (data) {
          console.log('📋 [إعدادات] تم استخدام إعدادات الخادم:', data);
          baseSettings = { ...data };
        } else {
          console.log('📋 [إعدادات] تم استخدام الإعدادات الافتراضية:', defaultSettings);
          baseSettings = { ...defaultSettings };
        }
      } catch (error) {
        console.error('❌ [إعدادات] خطأ في استرجاع الإعدادات الأساسية:', error);
        // في حالة حدوث خطأ، استخدم البيانات المتاحة
        baseSettings = data || { ...defaultSettings };
      }
      
      // اعتماد نهج مختلف: بدلاً من إرسال الحقل المتغير فقط، نرسل جميع الإعدادات المكتملة للخادم
      // هذا يحل مشكلة فقدان الإعدادات الأخرى عند التحديث
      const completeSettings = {
        ...baseSettings,
        ...newSettings,
        // إضافة علامة وقت للتحديث لتمييز هذا التحديث عن غيره
        _updated: updateTimestamp
      } as UserSettings;
      
      // طباعة الإعدادات المكتملة للتأكد من صحتها
      console.log('📑 [إعدادات] الإعدادات الكاملة المجهزة للإرسال:', completeSettings);
      
      // حفظ الإعدادات الكاملة محليًا فوراً قبل الإرسال للخادم (للتأكد من حفظها حتى في حالة الفشل)
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          // حفظ نسخة احتياطية من الإعدادات السابقة قبل التغيير
          const previousSettings = localStorage.getItem('userSettings');
          if (previousSettings) {
            localStorage.setItem('userSettings_backup', previousSettings);
          }
          
          // حفظ الإعدادات الجديدة
          localStorage.setItem('userSettings', JSON.stringify(completeSettings));
          localStorage.setItem('userSettings_lastUpdate', updateTimestamp);
          
          // حفظ سجل التغييرات للتتبع
          const changeLog = JSON.parse(localStorage.getItem('userSettings_changeLog') || '[]');
          changeLog.push({
            timestamp: updateTimestamp,
            changes: newSettings,
            completeSettings: completeSettings
          });
          
          // الاحتفاظ بآخر 10 تغييرات فقط
          if (changeLog.length > 10) {
            changeLog.shift();
          }
          
          localStorage.setItem('userSettings_changeLog', JSON.stringify(changeLog));
          
          console.log('💾 [إعدادات] تم حفظ الإعدادات الكاملة في التخزين المحلي');
        }
      } catch (error) {
        console.error('❌ [إعدادات] خطأ أثناء حفظ الإعدادات في التخزين المحلي:', error);
      }
      
      // تغيير أسلوب الإرسال إلى الخادم: نرسل الإعدادات الكاملة بدلاً من الحقل المتغير فقط
      console.log('🚀 [إعدادات] جاري إرسال الإعدادات الكاملة إلى الخادم...');
      
      // إستخدام طلب PUT لضمان تحديث جميع الإعدادات (بدلاً من PATCH الذي يحدث جزئياً)
      const response = await apiRequest('PUT', SETTINGS_KEY, completeSettings);
      
      if (!response.ok) {
        let errorMessage = 'حدث خطأ أثناء حفظ الإعدادات';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('❌ [إعدادات] رد خطأ من الخادم:', errorData);
        } catch (e) {
          console.error('❌ [إعدادات] خطأ عند معالجة استجابة الخطأ:', e);
        }
        
        throw new Error(errorMessage);
      }
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('✅ [إعدادات] استجابة ناجحة من الخادم:', responseData);
      } catch (e) {
        console.error('❌ [إعدادات] خطأ في تحليل استجابة الخادم:', e);
        responseData = completeSettings; // استخدام البيانات المحلية في حالة فشل تحليل الاستجابة
      }
      
      // إعادة تأكيد الإعدادات المحدثة في التخزين المحلي بعد نجاح الخادم
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('userSettings', JSON.stringify(responseData));
          localStorage.setItem('userSettings_serverConfirmed', 'true');
          console.log('✓ [إعدادات] تم تأكيد الإعدادات من الخادم وحفظها محلياً');
        }
      } catch (error) {
        console.error('❌ [إعدادات] خطأ في تحديث التخزين المحلي بعد استجابة الخادم:', error);
      }
      
      // إرجاع البيانات المستلمة من الخادم
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