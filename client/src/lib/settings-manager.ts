/**
 * مدير إعدادات المستخدم (ملف موحد)
 * يوفر واجهة برمجة بسيطة للتعامل مع إعدادات المستخدم
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { GeneralSettings, NotificationSettings, UserProfile, AllSettings } from "@/types/settings";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook لإدارة إعدادات المستخدم
 */
export function useSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [queryUpdateKey, setQueryUpdateKey] = useState<number>(Date.now());
  const { user } = useAuth();

  // استعلام لجلب جميع إعدادات المستخدم
  const { 
    data: allSettings, 
    isLoading, 
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['/api/settings', queryUpdateKey],
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  // حفظ الإعدادات في التخزين المحلي للوصول السريع
  useEffect(() => {
    if (allSettings?.general) {
      try {
        localStorage.setItem('userSettings', JSON.stringify(allSettings.general));
      } catch (error) {
        console.error("خطأ في تخزين الإعدادات محلياً:", error);
      }
    }
  }, [allSettings]);

  // تجهيز mutate للإعدادات العامة
  const updateGeneralSettings = useMutation({
    mutationFn: (data: Partial<GeneralSettings>) => apiRequest('/api/settings/general', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("settingsUpdated"),
        description: t("settingsUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // تحديث المفتاح للتحميل المباشر
      setQueryUpdateKey(Date.now());
    },
    onError: (error: any) => {
      toast({
        title: t("updateFailed"),
        description: error.message || t("genericError"),
        variant: "destructive",
      });
    },
  });

  // تجهيز mutate لإعدادات الإشعارات
  const updateNotificationSettings = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => apiRequest('/api/settings/notifications', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("notificationsUpdated"),
        description: t("notificationsUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // تحديث المفتاح للتحميل المباشر
      setQueryUpdateKey(Date.now());
    },
    onError: (error: any) => {
      toast({
        title: t("updateFailed"),
        description: error.message || t("genericError"),
        variant: "destructive",
      });
    },
  });

  // تجهيز mutate للملف الشخصي
  const updateProfile = useMutation({
    mutationFn: (data: Partial<UserProfile>) => apiRequest('/api/settings/profile', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("profileUpdated"),
        description: t("profileUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }); // تحديث معلومات المستخدم أيضاً
      
      // تحديث المفتاح للتحميل المباشر
      setQueryUpdateKey(Date.now());
    },
    onError: (error: any) => {
      toast({
        title: t("updateFailed"),
        description: error.message || t("genericError"),
        variant: "destructive",
      });
    },
  });

  // تجهيز mutate لإعدادات API
  const updateApiSettings = useMutation({
    mutationFn: (data: Partial<GeneralSettings>) => apiRequest('/api/settings/api', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("apiSettingsUpdated"),
        description: t("apiSettingsUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // تحديث المفتاح للتحميل المباشر
      setQueryUpdateKey(Date.now());
    },
    onError: (error: any) => {
      toast({
        title: t("updateFailed"),
        description: error.message || t("genericError"),
        variant: "destructive",
      });
    },
  });

  /**
   * تغيير إعداد واحد فقط (للتحديثات المباشرة)
   */
  const updateSingleSetting = (category: 'general' | 'notifications' | 'profile' | 'api', key: string, value: any) => {
    const data = { [key]: value };
    
    switch (category) {
      case 'general':
        updateGeneralSettings.mutate(data as Partial<GeneralSettings>);
        break;
      case 'notifications':
        updateNotificationSettings.mutate(data as Partial<NotificationSettings>);
        break;
      case 'profile':
        updateProfile.mutate(data as Partial<UserProfile>);
        break;
      case 'api':
        updateApiSettings.mutate(data as Partial<GeneralSettings>);
        break;
    }
  };

  /**
   * الحصول على قيمة الإعداد الحالية
   */
  const getSetting = (category: 'general' | 'notifications' | 'profile' | 'api', key: string): any => {
    if (!allSettings) return undefined;
    
    switch (category) {
      case 'general':
        return allSettings.general?.[key as keyof GeneralSettings];
      case 'notifications':
        return allSettings.notifications?.[key as keyof NotificationSettings];
      case 'profile':
        return allSettings.user?.[key as keyof UserProfile];
      case 'api':
        // إعدادات API موجودة ضمن الإعدادات العامة
        return allSettings.general?.[key as keyof GeneralSettings];
      default:
        return undefined;
    }
  };

  /**
   * استرجاع قيمة من التخزين المحلي (كواجهة احتياطية)
   */
  const getLocalSetting = (key: string): any => {
    try {
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        return settings[key];
      }
    } catch (error) {
      console.error("خطأ في استرداد الإعدادات من التخزين المحلي:", error);
    }
    return undefined;
  };

  return {
    allSettings,
    isLoading,
    refetchSettings,
    
    // دوال تحديث الإعدادات
    updateGeneralSettings,
    updateNotificationSettings,
    updateProfile,
    updateApiSettings,
    
    // دوال مساعدة
    updateSingleSetting,
    getSetting,
    getLocalSetting,
  };
}