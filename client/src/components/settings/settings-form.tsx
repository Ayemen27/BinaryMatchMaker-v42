/**
 * مكون نموذج الإعدادات العامة (نهج جديد مبسط)
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/lib/settings-manager";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";

// مخطط التحقق من صحة الإعدادات
const settingsSchema = z.object({
  theme: z.string(),
  defaultAsset: z.string(),
  defaultTimeframe: z.string(),
  defaultPlatform: z.string().optional(),
  chartType: z.string(),
  showTradingTips: z.boolean(),
  autoRefreshData: z.boolean(),
  refreshInterval: z.number().min(10).max(300),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// القيم الافتراضية البسيطة للنموذج
const defaultFormValues = {
  theme: 'dark',
  defaultAsset: 'BTC/USDT',
  defaultTimeframe: '1h',
  defaultPlatform: '',
  chartType: 'candlestick',
  showTradingTips: true,
  autoRefreshData: true,
  refreshInterval: 60,
};

export function SettingsForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // استخدام مدير الإعدادات الجديد
  const { 
    settings, 
    updateSettings,
    isLoading,
    isSaving 
  } = useSettings();
  
  // إنشاء نموذج مع القيم المستلمة من الخادم عند تحميل المكون
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    // استخدام القيم الفعلية من الخادم (settings) بدلاً من القيم الافتراضية
    values: {
      theme: settings.theme,
      defaultAsset: settings.defaultAsset,
      defaultTimeframe: settings.defaultTimeframe,
      defaultPlatform: settings.defaultPlatform || "",
      chartType: settings.chartType,
      showTradingTips: settings.showTradingTips,
      autoRefreshData: settings.autoRefreshData,
      refreshInterval: settings.refreshInterval,
    },
    // عند تغير أي قيمة مباشرة يتم الإرسال للخادم
    mode: "onChange",
  });
  
  // تحديث النموذج عند تغير القيم في الخادم
  useEffect(() => {
    if (!isLoading && settings) {
      console.log("[تحديث النموذج] إعادة تعيين القيم من الخادم:", settings);
      
      // تنفيذ إعادة تعيين كاملة بتجاهل القيم الافتراضية
      form.reset({
        theme: settings.theme,
        defaultAsset: settings.defaultAsset,
        defaultTimeframe: settings.defaultTimeframe,
        defaultPlatform: settings.defaultPlatform || "",
        chartType: settings.chartType,
        showTradingTips: settings.showTradingTips,
        autoRefreshData: settings.autoRefreshData,
        refreshInterval: settings.refreshInterval,
      }, { 
        keepDefaultValues: false,
        keepDirty: false, // إلغاء أي تغييرات معلقة
        keepValues: false, // إلغاء القيم القديمة
        keepErrors: false, // إلغاء أي أخطاء
        keepTouched: false, // إلغاء حالة اللمس
        keepDirtyValues: false, // إلغاء القيم المتغيرة
        keepIsSubmitted: false, // إلغاء حالة إرسال النموذج
        keepIsValid: false, // إلغاء حالة صحة النموذج
      });
      
      // تنفيذ تعيين يدوي لكل حقل لضمان التحديث
      Object.keys(settings).forEach((key) => {
        const fieldName = key as keyof SettingsFormValues;
        if (fieldName in settings && settings[fieldName] !== undefined) {
          const value = settings[fieldName];
          console.log(`[تحديث النموذج] تعيين قيمة الحقل ${fieldName}:`, value);
          form.setValue(fieldName, value);
        }
      });
    }
  }, [settings, isLoading, form.reset, form.setValue]);
  
  // إرسال النموذج
  // متغير لتخزين التغييرات المعلقة قبل الحفظ النهائي
  const [pendingChanges, setPendingChanges] = useState<Partial<SettingsFormValues>>({});
  
  // وظيفة تتبع تغييرات المستخدم وتخزينها مؤقتًا (بدون حفظ فوري في الخادم)
  function trackSettingChange(name: keyof SettingsFormValues, value: any) {
    console.log(`📋 [تتبع تغييرات] تسجيل تغيير معلق: ${name} = ${value}`);
    
    // إضافة التغيير إلى قائمة التغييرات المعلقة
    setPendingChanges(prev => ({
      ...prev,
      [name]: value
    }));
    
    // حفظ التغييرات مؤقتًا في التخزين المحلي للاسترجاع في حالة تحديث الصفحة
    try {
      const pendingChangesJson = localStorage.getItem('pendingSettingsChanges') || '{}';
      const currentPendingChanges = JSON.parse(pendingChangesJson);
      currentPendingChanges[name] = value;
      localStorage.setItem('pendingSettingsChanges', JSON.stringify(currentPendingChanges));
      console.log('💾 [تخزين مؤقت] تم حفظ التغييرات المعلقة في التخزين المحلي');
    } catch (error) {
      console.error('❌ [تخزين مؤقت] خطأ في حفظ التغييرات المعلقة:', error);
    }
  }
  
  // عند ضغط المستخدم على زر الحفظ، يتم إرسال جميع التغييرات المعلقة
  function onSubmit(data: SettingsFormValues) {
    // دمج التغييرات المعلقة مع الإعدادات الحالية
    const allChanges = {
      ...settings, // إعدادات المستخدم الحالية
      ...pendingChanges // التغييرات المعلقة
    };
    
    console.log('🚀 [حفظ الإعدادات] إرسال جميع التغييرات للخادم:', allChanges);
    
    // إرسال جميع الإعدادات للخادم
    updateSettings(allChanges);
    
    // بعد إرسال التغييرات بنجاح، نمسح قائمة التغييرات المعلقة
    setPendingChanges({});
    localStorage.removeItem('pendingSettingsChanges');
    
    // عرض رسالة تأكيد للمستخدم
    toast({
      title: t("settingsSaved") || "تم حفظ الإعدادات",
      description: t("settingsSavedDescription") || "تم حفظ جميع الإعدادات بنجاح",
    });
  }
  
  // قاموس لتخزين قيم الإعدادات الأصلية وقت التحميل
  const [originalSettings, setOriginalSettings] = useState<Record<string, any>>({});
  
  // حفظ نسخة من الإعدادات الأصلية عند تحميل المكون
  useEffect(() => {
    if (!isLoading && settings) {
      // إنشاء نسخة عميقة من الإعدادات الأصلية
      const initialValues = JSON.parse(JSON.stringify(settings));
      setOriginalSettings(initialValues);
      
      // سجل الإعدادات الأصلية في وحدة التحكم مع علامة خاصة للتتبع
      console.log('🔍 [تتبع-الإعدادات] القيم الأصلية عند التحميل:', initialValues);
    }
  }, [isLoading, settings]);
  
  // تغيير قيمة فردية مع تتبعها فقط (بدون حفظ مباشر)
  function handleSettingChange(name: keyof SettingsFormValues, value: any) {
    // سجل تفاصيل عملية التغيير
    console.log(`🔄 [تتبع-الإعدادات] بدء تغيير إعداد ${name}:`, {
      من: settings[name],
      إلى: value,
      وقت_التغيير: new Date().toISOString()
    });
    
    // تحديث قيمة الحقل في النموذج فوراً ليظهر التغيير في واجهة المستخدم
    form.setValue(name, value, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    
    // تطبيق تغيير الثيم فوراً إذا كان الإعداد هو الثيم
    if (name === 'theme' && window && document) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }
    
    // إضافة التغيير إلى قائمة التغييرات المعلقة باستخدام الوظيفة الجديدة
    trackSettingChange(name, value);
    
    // عرض تنبيه صغير للمستخدم بأن التغيير تم تسجيله وينتظر الحفظ
    toast({
      title: t("settingChanged") || "تم تغيير الإعداد",
      description: t("saveToApply") || "اضغط على حفظ لتطبيق التغييرات",
      duration: 3000
    });
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("theme")}</FormLabel>
                <Select
                  onValueChange={(value) => handleSettingChange("theme", value)}
                  value={settings.theme} // استخدام القيمة مباشرة من مدير الإعدادات
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectTheme")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="light">{t("light")}</SelectItem>
                    <SelectItem value="dark">{t("dark")}</SelectItem>
                    <SelectItem value="system">{t("system")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("themeDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="defaultAsset"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("defaultAsset")}</FormLabel>
                <Select
                  onValueChange={(value) => handleSettingChange("defaultAsset", value)}
                  value={settings.defaultAsset}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectAsset")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                    <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                    <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                    <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("assetDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="defaultTimeframe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("defaultTimeframe")}</FormLabel>
                <Select
                  onValueChange={(value) => handleSettingChange("defaultTimeframe", value)}
                  value={settings.defaultTimeframe}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectTimeframe")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1m">1 {t("minute")}</SelectItem>
                    <SelectItem value="5m">5 {t("minutes")}</SelectItem>
                    <SelectItem value="15m">15 {t("minutes")}</SelectItem>
                    <SelectItem value="30m">30 {t("minutes")}</SelectItem>
                    <SelectItem value="1h">1 {t("hour")}</SelectItem>
                    <SelectItem value="4h">4 {t("hours")}</SelectItem>
                    <SelectItem value="1d">1 {t("day")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("timeframeDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="chartType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("chartType")}</FormLabel>
                <Select
                  onValueChange={(value) => handleSettingChange("chartType", value)}
                  value={settings.chartType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectChartType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="candlestick">{t("candlestick")}</SelectItem>
                    <SelectItem value="line">{t("line")}</SelectItem>
                    <SelectItem value="bar">{t("bar")}</SelectItem>
                    <SelectItem value="area">{t("area")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("chartTypeDescription")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="refreshInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("refreshInterval")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="10"
                  max="300"
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(value);
                    if (value >= 10 && value <= 300) {
                      handleSettingChange("refreshInterval", value);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>{t("refreshIntervalDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="showTradingTips"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t("showTradingTips")}</FormLabel>
                  <FormDescription>
                    {t("showTradingTipsDescription")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={settings.showTradingTips}
                    defaultChecked={settings.showTradingTips}
                    onCheckedChange={(value) => {
                      field.onChange(value);
                      handleSettingChange("showTradingTips", value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="autoRefreshData"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t("autoRefreshData")}</FormLabel>
                  <FormDescription>
                    {t("autoRefreshDescription")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={settings.autoRefreshData}
                    defaultChecked={settings.autoRefreshData}
                    onCheckedChange={(value) => {
                      field.onChange(value);
                      handleSettingChange("autoRefreshData", value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full md:w-auto" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("saveSettings")}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}