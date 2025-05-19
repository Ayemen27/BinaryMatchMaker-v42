import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Save, Settings2 } from 'lucide-react';

// مخطط إعدادات المستخدم العامة
const userSettingsSchema = z.object({
  theme: z.string().default('dark'),
  defaultAsset: z.string().default('BTC/USDT'),
  defaultTimeframe: z.string().default('1h'),
  defaultPlatform: z.string().optional(),
  chartType: z.string().default('candlestick'),
  showTradingTips: z.boolean().default(true),
  autoRefreshData: z.boolean().default(true),
  refreshInterval: z.number().default(60),
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

interface UserSettings {
  id: number;
  userId: number;
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
  createdAt?: string;
  updatedAt?: string;
}

export function GeneralSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // تعريف القيم الافتراضية للاستخدام في حالة عدم وجود قيمة من الخادم
  const defaultSettings = {
    theme: 'dark',
    defaultAsset: 'BTC/USDT',
    defaultTimeframe: '1h',
    defaultPlatform: '',
    chartType: 'candlestick',
    showTradingTips: true,
    autoRefreshData: true,
    refreshInterval: 60,
  };
  
  // استرداد الإعدادات المخزنة محليًا (إن وجدت)
  const getLocalSettings = (): UserSettingsFormValues => {
    try {
      const storedSettings = localStorage.getItem('user_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        console.log("تم استرداد الإعدادات من التخزين المحلي:", parsedSettings);
        return parsedSettings;
      }
    } catch (error) {
      console.error("خطأ في استرداد الإعدادات من التخزين المحلي:", error);
    }
    return defaultSettings;
  };
  
  // حفظ الإعدادات في التخزين المحلي
  const saveLocalSettings = (settings: UserSettingsFormValues) => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(settings));
      console.log("تم حفظ الإعدادات في التخزين المحلي:", settings);
    } catch (error) {
      console.error("خطأ في حفظ الإعدادات في التخزين المحلي:", error);
    }
  };

  // نموذج إعدادات المستخدم العامة - نبدأ بالقيم المخزنة محليًا
  const settingsForm = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: getLocalSettings(),
  });

  // استعلام لجلب إعدادات المستخدم من الخادم
  const { data: userSettingsData, isLoading: isLoadingSettings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    queryFn: async () => {
      const res = await fetch('/api/user/settings');
      if (!res.ok) {
        // في حالة عدم وجود إعدادات للمستخدم (404)، نقوم بإنشاء إعدادات افتراضية
        if (res.status === 404) {
          // استخدام الإعدادات المحلية أو الافتراضية
          const initialSettings = getLocalSettings();
          
          // إرسال طلب لإنشاء إعدادات جديدة
          const createSettingsRes = await fetch('/api/user/settings', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(initialSettings),
          });
          
          if (createSettingsRes.ok) {
            return createSettingsRes.json();
          }
        }
        throw new Error(await res.text());
      }
      return res.json();
    },
    staleTime: 60000, // 60 ثانية
    gcTime: 300000, // 5 دقائق
    retry: 1,
  });
    
  // تحديث نموذج الإعدادات عند استرداد البيانات من الخادم 
  useEffect(() => {
    if (userSettingsData) {
      console.log("تم استلام إعدادات محدثة من الخادم:", userSettingsData);
      
      // تأكد من أن لدينا قيم سليمة لكل الحقول
      const updatedSettings = {
        theme: userSettingsData.theme || defaultSettings.theme,
        defaultAsset: userSettingsData.defaultAsset || defaultSettings.defaultAsset,
        defaultTimeframe: userSettingsData.defaultTimeframe || defaultSettings.defaultTimeframe,
        defaultPlatform: userSettingsData.defaultPlatform !== undefined ? userSettingsData.defaultPlatform : defaultSettings.defaultPlatform,
        chartType: userSettingsData.chartType || defaultSettings.chartType,
        showTradingTips: typeof userSettingsData.showTradingTips === 'boolean' ? userSettingsData.showTradingTips : defaultSettings.showTradingTips,
        autoRefreshData: typeof userSettingsData.autoRefreshData === 'boolean' ? userSettingsData.autoRefreshData : defaultSettings.autoRefreshData,
        refreshInterval: userSettingsData.refreshInterval !== undefined ? userSettingsData.refreshInterval : defaultSettings.refreshInterval,
      };
      
      console.log("تحديث النموذج بالإعدادات المستردة:", updatedSettings);
      
      // حفظ الإعدادات محليًا
      saveLocalSettings(updatedSettings);
      
      // تحديث نموذج إعدادات المستخدم العامة بشكل كامل
      settingsForm.reset(updatedSettings);
    }
  }, [userSettingsData, settingsForm]);

  // إتاحة تعديلات الإعدادات
  const settingsMutation = useMutation({
    mutationFn: async (data: UserSettingsFormValues) => {
      const res = await apiRequest("PATCH", "/api/user/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
      toast({
        title: t('settingsUpdated') || 'تم تحديث الإعدادات',
        description: t('settingsUpdateSuccess') || 'تم حفظ الإعدادات بنجاح',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('updateFailed') || 'فشل التحديث',
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // دالة حفظ التغييرات
  const onSubmit = (data: UserSettingsFormValues) => {
    settingsMutation.mutate(data);
  };

  // تغيير وحفظ الإعدادات فوراً عند تغيير قيمة أي حقل
  const saveSettingOnChange = (field: keyof UserSettingsFormValues, value: any) => {
    console.log(`تغيير إعداد ${field} إلى:`, value);
    
    // تحديث قيمة الحقل في النموذج
    settingsForm.setValue(field, value);
    
    // تأكد من أن لدينا جميع القيم الحالية مع القيم الافتراضية للحقول التي ليس لها قيمة
    // هذا مهم لضمان إرسال جميع الإعدادات في كل مرة
    const formValues = settingsForm.getValues();
    
    // تحضير كائن الإعدادات الكامل مع القيم الافتراضية للحقول الفارغة
    const completeSettings = {
      theme: formValues.theme || defaultSettings.theme,
      defaultAsset: formValues.defaultAsset || defaultSettings.defaultAsset,
      defaultTimeframe: formValues.defaultTimeframe || defaultSettings.defaultTimeframe,
      defaultPlatform: formValues.defaultPlatform !== undefined ? formValues.defaultPlatform : defaultSettings.defaultPlatform,
      chartType: formValues.chartType || defaultSettings.chartType,
      showTradingTips: typeof formValues.showTradingTips === 'boolean' ? formValues.showTradingTips : defaultSettings.showTradingTips,
      autoRefreshData: typeof formValues.autoRefreshData === 'boolean' ? formValues.autoRefreshData : defaultSettings.autoRefreshData,
      refreshInterval: formValues.refreshInterval !== undefined ? formValues.refreshInterval : defaultSettings.refreshInterval,
      // تحديث الحقل المتغير
      [field]: value
    };
    
    console.log("إرسال إعدادات كاملة للخادم:", completeSettings);
    
    // إرسال الإعدادات المحدثة الكاملة للخادم
    onSubmit(completeSettings);
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t('general') || 'الإعدادات العامة'}</CardTitle>
            <CardDescription>{t('generalSettingsDescription') || 'تعديل إعدادات التطبيق العامة وخيارات العرض'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {isLoadingSettings ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin opacity-50" />
          </div>
        ) : (
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={settingsForm.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('theme') || 'السمة'}</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full p-2 border border-border rounded-md bg-card"
                          onChange={(e) => {
                            field.onChange(e);
                            saveSettingOnChange('theme', e.target.value);
                          }}
                        >
                          <option value="dark">{t('darkTheme') || 'السمة الداكنة'}</option>
                          <option value="light">{t('lightTheme') || 'السمة الفاتحة'}</option>
                          <option value="system">{t('systemTheme') || 'سمة النظام'}</option>
                        </select>
                      </FormControl>
                      <FormDescription className="text-xs">{t('themeDescription') || 'تغيير مظهر التطبيق'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="defaultAsset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('defaultAsset') || 'الأصل الافتراضي'}</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full p-2 border border-border rounded-md bg-card"
                          onChange={(e) => {
                            field.onChange(e);
                            saveSettingOnChange('defaultAsset', e.target.value);
                          }}
                        >
                          <option value="BTC/USDT">BTC/USDT</option>
                          <option value="ETH/USDT">ETH/USDT</option>
                          <option value="XRP/USDT">XRP/USDT</option>
                          <option value="SOL/USDT">SOL/USDT</option>
                          <option value="DOGE/USDT">DOGE/USDT</option>
                        </select>
                      </FormControl>
                      <FormDescription className="text-xs">{t('defaultAssetDescription') || 'الأصل الافتراضي عند فتح التطبيق'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={settingsForm.control}
                  name="defaultTimeframe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('defaultTimeframe') || 'الإطار الزمني الافتراضي'}</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full p-2 border border-border rounded-md bg-card"
                          onChange={(e) => {
                            field.onChange(e);
                            saveSettingOnChange('defaultTimeframe', e.target.value);
                          }}
                        >
                          <option value="1m">1 {t('minute') || 'دقيقة'}</option>
                          <option value="5m">5 {t('minutes') || 'دقائق'}</option>
                          <option value="15m">15 {t('minutes') || 'دقيقة'}</option>
                          <option value="30m">30 {t('minutes') || 'دقيقة'}</option>
                          <option value="1h">1 {t('hour') || 'ساعة'}</option>
                          <option value="4h">4 {t('hours') || 'ساعات'}</option>
                          <option value="1d">1 {t('day') || 'يوم'}</option>
                          <option value="1w">1 {t('week') || 'أسبوع'}</option>
                        </select>
                      </FormControl>
                      <FormDescription className="text-xs">{t('defaultTimeframeDescription') || 'الإطار الزمني الافتراضي للرسوم البيانية'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="chartType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('chartType') || 'نوع الرسم البياني'}</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full p-2 border border-border rounded-md bg-card"
                          onChange={(e) => {
                            field.onChange(e);
                            saveSettingOnChange('chartType', e.target.value);
                          }}
                        >
                          <option value="candlestick">{t('candlestick') || 'الشموع اليابانية'}</option>
                          <option value="line">{t('line') || 'خط'}</option>
                          <option value="bar">{t('bar') || 'أعمدة'}</option>
                          <option value="area">{t('area') || 'مساحة'}</option>
                        </select>
                      </FormControl>
                      <FormDescription className="text-xs">{t('chartTypeDescription') || 'نوع الرسم البياني المفضل'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={settingsForm.control}
                name="refreshInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('refreshInterval') || 'فترة التحديث (بالثواني)'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        className="border-border focus-visible:ring-primary"
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(value);
                          // استخدام setTimeout لتجنب الكثير من الطلبات المتزامنة
                          setTimeout(() => {
                            saveSettingOnChange('refreshInterval', value);
                          }, 500);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t('refreshIntervalDescription') || 'الفترة الزمنية لتحديث البيانات تلقائيًا (بالثواني)'}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4 border rounded-lg border-border p-4 bg-muted/20 mt-4">
                <h3 className="text-sm font-medium">{t('otherSettings') || 'إعدادات أخرى'}</h3>
                
                <FormField
                  control={settingsForm.control}
                  name="showTradingTips"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>{t('showTradingTips') || 'عرض نصائح التداول'}</FormLabel>
                        <FormDescription className="text-xs">{t('showTradingTipsDescription') || 'عرض نصائح وتلميحات للتداول'}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            saveSettingOnChange('showTradingTips', checked);
                          }} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="autoRefreshData"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>{t('autoRefreshData') || 'تحديث البيانات تلقائيًا'}</FormLabel>
                        <FormDescription className="text-xs">{t('autoRefreshDataDescription') || 'تحديث البيانات تلقائيًا حسب فترة التحديث المحددة'}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            saveSettingOnChange('autoRefreshData', checked);
                          }} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-4 border-t border-border mt-6">
                <Button 
                  type="submit"
                  disabled={settingsMutation.isPending}
                  className="relative overflow-hidden group"
                >
                  {settingsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  )}
                  {t('saveAllSettings') || 'حفظ جميع الإعدادات'}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}