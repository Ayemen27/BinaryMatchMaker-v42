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
  
  // إنشاء نموذج مع القيم الافتراضية
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultFormValues,
  });
  
  // تحديث قيم النموذج عندما تتغير الإعدادات
  useEffect(() => {
    if (!isLoading && settings) {
      form.reset({
        theme: settings.theme || defaultFormValues.theme,
        defaultAsset: settings.defaultAsset || defaultFormValues.defaultAsset,
        defaultTimeframe: settings.defaultTimeframe || defaultFormValues.defaultTimeframe,
        defaultPlatform: settings.defaultPlatform || defaultFormValues.defaultPlatform,
        chartType: settings.chartType || defaultFormValues.chartType,
        showTradingTips: settings.showTradingTips ?? defaultFormValues.showTradingTips,
        autoRefreshData: settings.autoRefreshData ?? defaultFormValues.autoRefreshData,
        refreshInterval: settings.refreshInterval || defaultFormValues.refreshInterval,
      });
    }
  }, [settings, isLoading, form.reset]);
  
  // إرسال النموذج
  function onSubmit(data: SettingsFormValues) {
    updateSettings(data);
  }
  
  // تغيير قيمة فردية على الفور
  function handleSettingChange(name: keyof SettingsFormValues, value: any) {
    form.setValue(name, value);
    
    // إرسال القيمة الجديدة إلى الخادم على الفور للحصول على تحديث فوري
    const formValues = form.getValues();
    updateSettings({ ...formValues, [name]: value });
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
                  defaultValue={field.value}
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
                  defaultValue={field.value}
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
                  defaultValue={field.value}
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
                  defaultValue={field.value}
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
                    checked={field.value}
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
                    checked={field.value}
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