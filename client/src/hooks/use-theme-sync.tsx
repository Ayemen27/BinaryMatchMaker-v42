/**
 * هوك مزامنة الثيم - لربط إعدادات المستخدم المخزنة في قاعدة البيانات مع مكتبة next-themes
 */

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSettings } from '@/lib/settings-manager';

export const useThemeSync = () => {
  // الوصول إلى مدير السمات من next-themes
  const { setTheme, theme } = useTheme();
  
  // الوصول إلى إعدادات المستخدم من قاعدة البيانات
  const { settings, isLoading } = useSettings();
  
  // مزامنة السمة من قاعدة البيانات مع next-themes عند تحميل الإعدادات
  useEffect(() => {
    if (!isLoading && settings && settings.theme && theme !== settings.theme) {
      console.log(`[مزامنة الثيم] تطبيق الثيم من قاعدة البيانات: ${settings.theme}`);
      setTheme(settings.theme);
    }
  }, [settings, isLoading, setTheme, theme]);
  
  return { currentTheme: theme };
};

// مكون مزامنة الثيم - يجب استخدامه في التطبيق الرئيسي
export const ThemeSync = () => {
  useThemeSync();
  return null;
};