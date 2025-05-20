/**
 * هوك مزامنة الثيم - لربط إعدادات المستخدم المخزنة في قاعدة البيانات مع مكتبة next-themes
 * تم إصلاحه لمنع حلقة التحديثات المستمرة بين الواجهة وقاعدة البيانات
 */

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useSettings } from '@/lib/settings-manager';

// هوك خاص بمزامنة السمة
export function useThemeSync() {
  // الوصول إلى مدير السمات من next-themes
  const { setTheme, theme } = useTheme();
  
  // الوصول إلى إعدادات المستخدم من قاعدة البيانات
  const { settings, isLoading, updateSetting } = useSettings();
  
  // المتغير لمنع التحديثات المستمرة - متغير ثابت لكل حالة
  const isUpdatingRef = useRef(false);
  
  // مزامنة أحادية الاتجاه: من قاعدة البيانات إلى الواجهة عند التحميل
  useEffect(() => {
    // تجاهل التحديثات إذا كان التحميل قيد التقدم
    if (isLoading) return;
    
    // إذا كان هناك إعدادات وليست عملية التحديث جارية
    if (settings && !isUpdatingRef.current) {
      // إذا كان الثيم المخزن مختلف عن الحالي
      if (settings.theme && theme !== settings.theme) {
        console.log(`[مزامنة الثيم] تطبيق الثيم من قاعدة البيانات: ${settings.theme}`);
        
        // تعيين علامة التحديث لمنع حلقة لا نهائية
        isUpdatingRef.current = true;
        
        // تطبيق الثيم من الإعدادات
        setTheme(settings.theme);
        
        // إعادة تعيين العلامة بعد فترة قصيرة
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  }, [settings, theme, setTheme, isLoading]);
  
  // مزامنة أحادية الاتجاه: من الواجهة إلى قاعدة البيانات عند تغيير المستخدم للثيم
  useEffect(() => {
    // إنشاء متغير لتخزين آخر ثيم تم تطبيقه
    const lastTheme = useRef(theme);
    
    // تجاهل التحديثات إذا كان التحميل قيد التقدم أو عملية التحديث جارية
    if (isLoading || isUpdatingRef.current) return;
    
    // فقط إذا تغير الثيم بالفعل (لمنع التحديثات عند التحميل الأولي)
    if (settings && theme && lastTheme.current !== theme) {
      console.log(`[مزامنة الثيم] حفظ الثيم المحدث في قاعدة البيانات: ${theme}`);
      
      // تحديث الإعدادات في قاعدة البيانات
      updateSetting('theme', theme);
      
      // تحديث آخر ثيم
      lastTheme.current = theme;
    }
  }, [theme, settings, isLoading, updateSetting]);
  
  // لا نحتاج لإرجاع أي قيمة
  return null;
}

// مكون مزامنة الثيم - يتم استخدامه في التطبيق الرئيسي
export function ThemeSync() {
  useThemeSync();
  return null;
}