/**
 * صفحة الإعدادات الموحدة
 * واجهة مستخدم متكاملة لجميع إعدادات المستخدم
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { Helmet } from "react-helmet";
import { Layout } from "@/components/layout/layout";

// المكونات
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// الأيقونات
import {
  User,
  Settings,
  Bell,
  Key,
  Moon,
  Sun,
  Save,
  Loader2,
  ChevronRight,
} from "lucide-react";

// Form validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// مخططات التحقق من صحة الإعدادات
const profileSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional().or(z.literal("")),
  fullName: z.string().max(100).optional().or(z.literal("")),
  language: z.string(),
});

const generalSettingsSchema = z.object({
  theme: z.string(),
  defaultAsset: z.string(),
  defaultTimeframe: z.string(),
  defaultPlatform: z.string().optional().or(z.literal("")),
  chartType: z.string(),
  showTradingTips: z.boolean(),
  autoRefreshData: z.boolean(),
  refreshInterval: z.number().min(10).max(300),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  signalAlerts: z.boolean(),
  marketUpdates: z.boolean(),
  accountAlerts: z.boolean(),
  promotionalEmails: z.boolean(),
});

const apiSettingsSchema = z.object({
  useAiForSignals: z.boolean(),
  useCustomAiKey: z.boolean(),
  openaiApiKey: z.string().optional().or(z.literal("")),
});

// أنواع البيانات
type ProfileFormValues = z.infer<typeof profileSchema>;
type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;
type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;
type ApiSettingsFormValues = z.infer<typeof apiSettingsSchema>;

export default function UnifiedSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // حالات التبويب والتحميل
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  
  // للتعامل مع إعادة تحميل الصفحة
  const [queryUpdateKey, setQueryUpdateKey] = useState<number>(Date.now());
  
  // إذا لم يكن المستخدم مسجل دخوله، قم بتوجيهه إلى صفحة تسجيل الدخول
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // استعلام لجلب جميع إعدادات المستخدم من الخادم
  const { 
    data: allSettings, 
    isLoading: isLoadingSettings, 
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['/api/settings', queryUpdateKey],
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  
  // نماذج الإعدادات
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      fullName: user?.fullName || "",
      language: user?.language || "ar",
    },
  });
  
  const generalSettingsForm = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      theme: "light",
      defaultAsset: "BTC/USDT",
      defaultTimeframe: "1h",
      defaultPlatform: "",
      chartType: "candlestick",
      showTradingTips: true,
      autoRefreshData: true,
      refreshInterval: 60,
    },
  });
  
  const notificationSettingsForm = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      signalAlerts: true,
      marketUpdates: false,
      accountAlerts: true,
      promotionalEmails: false,
    },
  });
  
  const apiSettingsForm = useForm<ApiSettingsFormValues>({
    resolver: zodResolver(apiSettingsSchema),
    defaultValues: {
      useAiForSignals: true,
      useCustomAiKey: false,
      openaiApiKey: "",
    },
  });
  
  // تحديث نماذج الإعدادات عند استلام البيانات
  useEffect(() => {
    if (allSettings) {
      // تحديث نموذج الملف الشخصي
      if (allSettings.user) {
        profileForm.reset({
          username: allSettings.user.username || "",
          email: allSettings.user.email || "",
          fullName: allSettings.user.fullName || "",
          language: allSettings.user.language || "ar",
        });
      }
      
      // تحديث نموذج الإعدادات العامة
      if (allSettings.general) {
        generalSettingsForm.reset({
          theme: allSettings.general.theme || "light",
          defaultAsset: allSettings.general.defaultAsset || "BTC/USDT",
          defaultTimeframe: allSettings.general.defaultTimeframe || "1h",
          defaultPlatform: allSettings.general.defaultPlatform || "",
          chartType: allSettings.general.chartType || "candlestick",
          showTradingTips: typeof allSettings.general.showTradingTips === 'boolean' ? allSettings.general.showTradingTips : true,
          autoRefreshData: typeof allSettings.general.autoRefreshData === 'boolean' ? allSettings.general.autoRefreshData : true,
          refreshInterval: allSettings.general.refreshInterval || 60,
        });
      }
      
      // تحديث نموذج إعدادات الإشعارات
      if (allSettings.notifications) {
        notificationSettingsForm.reset({
          emailNotifications: typeof allSettings.notifications.emailNotifications === 'boolean' ? allSettings.notifications.emailNotifications : true,
          pushNotifications: typeof allSettings.notifications.pushNotifications === 'boolean' ? allSettings.notifications.pushNotifications : true,
          signalAlerts: typeof allSettings.notifications.signalAlerts === 'boolean' ? allSettings.notifications.signalAlerts : true,
          marketUpdates: typeof allSettings.notifications.marketUpdates === 'boolean' ? allSettings.notifications.marketUpdates : false,
          accountAlerts: typeof allSettings.notifications.accountAlerts === 'boolean' ? allSettings.notifications.accountAlerts : true,
          promotionalEmails: typeof allSettings.notifications.promotionalEmails === 'boolean' ? allSettings.notifications.promotionalEmails : false,
        });
      }
      
      // تحديث نموذج إعدادات API
      if (allSettings.general) {
        // هذه الإعدادات موجودة في الإعدادات العامة
        apiSettingsForm.reset({
          useAiForSignals: typeof allSettings.general.useAiForSignals === 'boolean' ? allSettings.general.useAiForSignals : true,
          useCustomAiKey: typeof allSettings.general.useCustomAiKey === 'boolean' ? allSettings.general.useCustomAiKey : false,
          openaiApiKey: allSettings.general.openaiApiKey || "",
        });
      }
    }
  }, [allSettings]);
  
  // تجهيز mutate للملف الشخصي
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => apiRequest('/api/settings/profile', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("profileUpdated"),
        description: t("profileUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: t("updateFailed"),
        description: error.message || t("genericError"),
        variant: "destructive",
      });
    },
  });
  
  // تجهيز mutate للإعدادات العامة
  const updateGeneralSettingsMutation = useMutation({
    mutationFn: (data: GeneralSettingsFormValues) => apiRequest('/api/settings/general', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("settingsUpdated"),
        description: t("settingsUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
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
  const updateNotificationSettingsMutation = useMutation({
    mutationFn: (data: NotificationSettingsFormValues) => apiRequest('/api/settings/notifications', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("notificationsUpdated"),
        description: t("notificationsUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
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
  const updateApiSettingsMutation = useMutation({
    mutationFn: (data: ApiSettingsFormValues) => apiRequest('/api/settings/api', 'PUT', data),
    onSuccess: () => {
      toast({
        title: t("apiSettingsUpdated"),
        description: t("apiSettingsUpdateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: t("updateFailed"),
        description: error.message || t("genericError"),
        variant: "destructive",
      });
    },
  });
  
  // وظيفة تعديل إعداد فردي في إعدادات الإشعارات
  function updateNotificationSetting(name: keyof NotificationSettingsFormValues, value: boolean) {
    console.log("تغيير إعداد الإشعارات:", name, "=", value);
    
    // تحديث قيمة الحقل في النموذج فوراً
    notificationSettingsForm.setValue(name, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    
    // إنشاء كائن الإعدادات الكامل
    const currentValues = notificationSettingsForm.getValues();
    const updatedSettings = {
      ...currentValues,
      [name]: value
    };
    
    console.log("تحديث إعدادات الإشعارات:", updatedSettings);
    
    // إرسال الإعدادات المحدثة للخادم
    updateNotificationSettingsMutation.mutate(updatedSettings);
  }
  
  // التعامل مع تغيير اللغة
  function handleLanguageChange(value: string) {
    if (value) {
      i18n.changeLanguage(value);
      profileForm.setValue('language', value);
      
      // تحديث اللغة في الخادم
      const currentValues = profileForm.getValues();
      updateProfileMutation.mutate({
        ...currentValues,
        language: value
      });
      
      // عرض رسالة نجاح
      toast({
        title: t("languageChanged"),
        description: t("languageChangeSuccess"),
      });
    }
  }
  
  return (
    <Layout>
      <Helmet>
        <title>{t('settings')} | Binarjoin Analytics</title>
        <meta name="description" content={t('settingsDescription')} />
      </Helmet>
      
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{t('settings')}</h1>
            <p className="text-muted-foreground">{t('settingsDescription')}</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{t('profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>{t('general')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>{t('notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span>{t('apiSettings')}</span>
            </TabsTrigger>
          </TabsList>
          
          {isLoadingSettings ? (
            <Card className="w-full">
              <CardContent className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <p>{t('loadingSettings')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* الملف الشخصي */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('profileSettings')}</CardTitle>
                    <CardDescription>{t('profileSettingsDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('username')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('email')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('fullName')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('language')}</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={(value) => handleLanguageChange(value)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('selectLanguage')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ar">العربية</SelectItem>
                                  <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full md:w-auto mt-4"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('saveProfile')}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* الإعدادات العامة */}
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('generalSettings')}</CardTitle>
                    <CardDescription>{t('generalSettingsDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...generalSettingsForm}>
                      <form onSubmit={generalSettingsForm.handleSubmit(data => updateGeneralSettingsMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={generalSettingsForm.control}
                          name="theme"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('theme')}</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  document.documentElement.classList.remove('light', 'dark');
                                  document.documentElement.classList.add(value);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('selectTheme')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="light" className="flex items-center">
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>{t('lightTheme')}</span>
                                  </SelectItem>
                                  <SelectItem value="dark" className="flex items-center">
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>{t('darkTheme')}</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={generalSettingsForm.control}
                            name="defaultAsset"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('defaultAsset')}</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t('selectAsset')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                                    <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                                    <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                                    <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                                    <SelectItem value="ADA/USDT">ADA/USDT</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={generalSettingsForm.control}
                            name="defaultTimeframe"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('defaultTimeframe')}</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t('selectTimeframe')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1m">1 {t('minute')}</SelectItem>
                                    <SelectItem value="5m">5 {t('minutes')}</SelectItem>
                                    <SelectItem value="15m">15 {t('minutes')}</SelectItem>
                                    <SelectItem value="30m">30 {t('minutes')}</SelectItem>
                                    <SelectItem value="1h">1 {t('hour')}</SelectItem>
                                    <SelectItem value="4h">4 {t('hours')}</SelectItem>
                                    <SelectItem value="1d">1 {t('day')}</SelectItem>
                                    <SelectItem value="1w">1 {t('week')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={generalSettingsForm.control}
                          name="defaultPlatform"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('defaultPlatform')}</FormLabel>
                              <Select value={field.value || ""} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('selectPlatform')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">
                                    <span>{t('noPlatform')}</span>
                                  </SelectItem>
                                  <SelectItem value="binance">Binance</SelectItem>
                                  <SelectItem value="bybit">Bybit</SelectItem>
                                  <SelectItem value="kucoin">KuCoin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={generalSettingsForm.control}
                          name="chartType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('chartType')}</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('selectChartType')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="candlestick">{t('candlestick')}</SelectItem>
                                  <SelectItem value="line">{t('line')}</SelectItem>
                                  <SelectItem value="bar">{t('bar')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Separator className="my-4" />
                        
                        <div className="space-y-4">
                          <FormField
                            control={generalSettingsForm.control}
                            name="showTradingTips"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>{t('showTradingTips')}</FormLabel>
                                  <FormDescription>
                                    {t('showTradingTipsDescription')}
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={generalSettingsForm.control}
                            name="autoRefreshData"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>{t('autoRefreshData')}</FormLabel>
                                  <FormDescription>
                                    {t('autoRefreshDataDescription')}
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={generalSettingsForm.control}
                            name="refreshInterval"
                            render={({ field }) => (
                              <FormItem className={generalSettingsForm.watch("autoRefreshData") ? "" : "opacity-50"}>
                                <FormLabel>{t('refreshInterval')}</FormLabel>
                                <FormDescription>
                                  {t('refreshIntervalDescription')}
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    min={10}
                                    max={300}
                                    disabled={!generalSettingsForm.watch("autoRefreshData")}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full md:w-auto mt-4"
                          disabled={updateGeneralSettingsMutation.isPending}
                        >
                          {updateGeneralSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('saveSettings')}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* إعدادات الإشعارات */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('notificationSettings')}</CardTitle>
                    <CardDescription>{t('notificationSettingsDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-medium">{t('emailNotifications')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('emailNotificationsDescription')}
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettingsForm.watch("emailNotifications")}
                            onCheckedChange={(checked) => updateNotificationSetting("emailNotifications", checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-medium">{t('pushNotifications')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('pushNotificationsDescription')}
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettingsForm.watch("pushNotifications")}
                            onCheckedChange={(checked) => updateNotificationSetting("pushNotifications", checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-medium">{t('signalAlerts')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('signalAlertsDescription')}
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettingsForm.watch("signalAlerts")}
                            onCheckedChange={(checked) => updateNotificationSetting("signalAlerts", checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-medium">{t('marketUpdates')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('marketUpdatesDescription')}
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettingsForm.watch("marketUpdates")}
                            onCheckedChange={(checked) => updateNotificationSetting("marketUpdates", checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-medium">{t('accountAlerts')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('accountAlertsDescription')}
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettingsForm.watch("accountAlerts")}
                            onCheckedChange={(checked) => updateNotificationSetting("accountAlerts", checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-medium">{t('promotionalEmails')}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('promotionalEmailsDescription')}
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettingsForm.watch("promotionalEmails")}
                            onCheckedChange={(checked) => updateNotificationSetting("promotionalEmails", checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* إعدادات API */}
              <TabsContent value="api">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('apiSettings')}</CardTitle>
                    <CardDescription>{t('apiSettingsDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...apiSettingsForm}>
                      <form onSubmit={apiSettingsForm.handleSubmit(data => updateApiSettingsMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={apiSettingsForm.control}
                          name="useAiForSignals"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>{t('useAiForSignals')}</FormLabel>
                                <FormDescription>
                                  {t('useAiForSignalsDescription')}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={apiSettingsForm.control}
                          name="useCustomAiKey"
                          render={({ field }) => (
                            <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm ${!apiSettingsForm.watch("useAiForSignals") ? "opacity-50" : ""}`}>
                              <div className="space-y-0.5">
                                <FormLabel>{t('useCustomAiKey')}</FormLabel>
                                <FormDescription>
                                  {t('useCustomAiKeyDescription')}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!apiSettingsForm.watch("useAiForSignals")}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={apiSettingsForm.control}
                          name="openaiApiKey"
                          render={({ field }) => (
                            <FormItem className={`${!apiSettingsForm.watch("useAiForSignals") || !apiSettingsForm.watch("useCustomAiKey") ? "opacity-50" : ""}`}>
                              <FormLabel>{t('openaiApiKey')}</FormLabel>
                              <FormDescription>
                                {t('openaiApiKeyDescription')}
                              </FormDescription>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type={showApiKey ? "text" : "password"}
                                    disabled={!apiSettingsForm.watch("useAiForSignals") || !apiSettingsForm.watch("useCustomAiKey")}
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  disabled={!apiSettingsForm.watch("useAiForSignals") || !apiSettingsForm.watch("useCustomAiKey")}
                                >
                                  {showApiKey ? t('hide') : t('show')}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full md:w-auto mt-4"
                          disabled={updateApiSettingsMutation.isPending}
                        >
                          {updateApiSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('saveApiSettings')}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}