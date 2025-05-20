/**
 * هوك مزامنة الثيم - لربط إعدادات المستخدم المخزنة في قاعدة البيانات مع مكتبة next-themes
 */

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSettings } from '@/lib/settings-manager';

export function useThemeSync() {
  // الوصول إلى مدير السمات من next-themes
  const { setTheme, theme } = useTheme();
  
  // الوصول إلى إعدادات المستخدم من قاعدة البيانات
  const { settings, isLoading, updateSetting } = useSettings();
  
  // مزامنة ثنائية الاتجاه:
  // 1. من قاعدة البيانات إلى واجهة المستخدم
  // 2. في حالة عدم وجود قيمة في قاعدة البيانات، حفظ القيمة الحالية من الواجهة إلى قاعدة البيانات
  useEffect(() => {
    if (isLoading) return;
    
    if (settings) {
      if (settings.theme) {
        // إذا كانت هناك قيمة في قاعدة البيانات تختلف عن الواجهة، نطبق قيمة قاعدة البيانات
        if (theme !== settings.theme) {
          console.log(`[مزامنة الثيم] تطبيق الثيم من قاعدة البيانات: ${settings.theme}`);
          setTheme(settings.theme);
        }
      } else if (theme) {
        // إذا لم تكن هناك قيمة في قاعدة البيانات، نحفظ القيمة الحالية من الواجهة
        console.log(`[مزامنة الثيم] حفظ الثيم الحالي في قاعدة البيانات: ${theme}`);
        updateSetting('theme', theme);
      }
    }
  }, [settings, isLoading, theme, setTheme, updateSetting]);
  
  // عند تغيير السمة في الواجهة، نحفظها في قاعدة البيانات
  useEffect(() => {
    if (isLoading || !settings || !theme) return;
    
    // إذا تغيرت السمة في الواجهة وكانت مختلفة عن قاعدة البيانات
    if (theme !== settings.theme) {
      console.log(`[مزامنة الثيم] حفظ الثيم المحدث في قاعدة البيانات: ${theme}`);
      updateSetting('theme', theme);
    }
  }, [theme, settings, isLoading, updateSetting]);
  
  return { currentTheme: theme };
}

// مكون مزامنة الثيم - يجب استخدامه في التطبيق الرئيسي
export const ThemeSync = () => {
  useThemeSync();
  return null;
};