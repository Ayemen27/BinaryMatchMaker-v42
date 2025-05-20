/**
 * علامات تبويب الإعدادات الموحدة
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/lib/settings-manager";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
  Eye,
  EyeOff,
} from "lucide-react";

// Form validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { GeneralSettings, NotificationSettings, UserProfile, AllSettings } from "@/types/settings";

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

export function SettingsTabs() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { allSettings, isLoading, updateProfile, updateGeneralSettings, updateNotificationSettings, updateApiSettings, updateSingleSetting } = useSettings();
  
  // حالات التبويب
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  
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
  if (allSettings) {
    // تحديث نموذج الملف الشخصي
    if (allSettings.user) {
      const profileValues = {
        username: allSettings.user.username || "",
        email: allSettings.user.email || "",
        fullName: allSettings.user.fullName || "",
        language: allSettings.user.language || "ar",
      };
      
      if (
        profileForm.getValues().username !== profileValues.username ||
        profileForm.getValues().email !== profileValues.email ||
        profileForm.getValues().fullName !== profileValues.fullName ||
        profileForm.getValues().language !== profileValues.language
      ) {
        profileForm.reset(profileValues);
      }
    }
    
    // تحديث نموذج الإعدادات العامة
    if (allSettings.general) {
      const generalValues = {
        theme: allSettings.general.theme || "light",
        defaultAsset: allSettings.general.defaultAsset || "BTC/USDT",
        defaultTimeframe: allSettings.general.defaultTimeframe || "1h",
        defaultPlatform: allSettings.general.defaultPlatform || "",
        chartType: allSettings.general.chartType || "candlestick",
        showTradingTips: typeof allSettings.general.showTradingTips === 'boolean' ? allSettings.general.showTradingTips : true,
        autoRefreshData: typeof allSettings.general.autoRefreshData === 'boolean' ? allSettings.general.autoRefreshData : true,
        refreshInterval: allSettings.general.refreshInterval || 60,
      };
      
      // التحقق من وجود تغييرات قبل إعادة الضبط
      if (
        generalSettingsForm.getValues().theme !== generalValues.theme ||
        generalSettingsForm.getValues().defaultAsset !== generalValues.defaultAsset ||
        generalSettingsForm.getValues().defaultTimeframe !== generalValues.defaultTimeframe ||
        generalSettingsForm.getValues().chartType !== generalValues.chartType ||
        generalSettingsForm.getValues().showTradingTips !== generalValues.showTradingTips ||
        generalSettingsForm.getValues().autoRefreshData !== generalValues.autoRefreshData ||
        generalSettingsForm.getValues().refreshInterval !== generalValues.refreshInterval
      ) {
        generalSettingsForm.reset(generalValues);
      }
    }
    
    // تحديث نموذج إعدادات الإشعارات
    if (allSettings.notifications) {
      const notificationValues = {
        emailNotifications: typeof allSettings.notifications.emailNotifications === 'boolean' ? allSettings.notifications.emailNotifications : true,
        pushNotifications: typeof allSettings.notifications.pushNotifications === 'boolean' ? allSettings.notifications.pushNotifications : true,
        signalAlerts: typeof allSettings.notifications.signalAlerts === 'boolean' ? allSettings.notifications.signalAlerts : true,
        marketUpdates: typeof allSettings.notifications.marketUpdates === 'boolean' ? allSettings.notifications.marketUpdates : false,
        accountAlerts: typeof allSettings.notifications.accountAlerts === 'boolean' ? allSettings.notifications.accountAlerts : true,
        promotionalEmails: typeof allSettings.notifications.promotionalEmails === 'boolean' ? allSettings.notifications.promotionalEmails : false,
      };
      
      if (
        notificationSettingsForm.getValues().emailNotifications !== notificationValues.emailNotifications ||
        notificationSettingsForm.getValues().pushNotifications !== notificationValues.pushNotifications ||
        notificationSettingsForm.getValues().signalAlerts !== notificationValues.signalAlerts ||
        notificationSettingsForm.getValues().marketUpdates !== notificationValues.marketUpdates ||
        notificationSettingsForm.getValues().accountAlerts !== notificationValues.accountAlerts ||
        notificationSettingsForm.getValues().promotionalEmails !== notificationValues.promotionalEmails
      ) {
        notificationSettingsForm.reset(notificationValues);
      }
    }
    
    // تحديث نموذج إعدادات API
    if (allSettings.general) {
      const apiValues = {
        useAiForSignals: typeof allSettings.general.useAiForSignals === 'boolean' ? allSettings.general.useAiForSignals : true,
        useCustomAiKey: typeof allSettings.general.useCustomAiKey === 'boolean' ? allSettings.general.useCustomAiKey : false,
        openaiApiKey: allSettings.general.openaiApiKey || "",
      };
      
      if (
        apiSettingsForm.getValues().useAiForSignals !== apiValues.useAiForSignals ||
        apiSettingsForm.getValues().useCustomAiKey !== apiValues.useCustomAiKey ||
        apiSettingsForm.getValues().openaiApiKey !== apiValues.openaiApiKey
      ) {
        apiSettingsForm.reset(apiValues);
      }
    }
  }
  
  // التعامل مع تغيير اللغة
  function handleLanguageChange(value: string) {
    if (value) {
      i18n.changeLanguage(value);
      profileForm.setValue('language', value);
      
      // تحديث اللغة في الخادم
      const currentValues = profileForm.getValues();
      updateProfile.mutate({
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
  
  // تحديث إعداد فردي في إعدادات الإشعارات
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
    
    // إرسال الإعدادات المحدثة للخادم
    updateNotificationSettings.mutate(updatedSettings);
  }
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-4 w-full mb-4">
        <TabsTrigger value="profile" className="flex items-center space-x-2">
          <User className="h-4 w-4 ml-1" />
          <span>{t('profile')}</span>
        </TabsTrigger>
        <TabsTrigger value="general" className="flex items-center space-x-2">
          <Settings className="h-4 w-4 ml-1" />
          <span>{t('general')}</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center space-x-2">
          <Bell className="h-4 w-4 ml-1" />
          <span>{t('notifications')}</span>
        </TabsTrigger>
        <TabsTrigger value="api" className="flex items-center space-x-2">
          <Key className="h-4 w-4 ml-1" />
          <span>{t('apiSettings')}</span>
        </TabsTrigger>
      </TabsList>
      
      {isLoading ? (
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
                  <form onSubmit={profileForm.handleSubmit(data => updateProfile.mutate(data))} className="space-y-4">
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
                            onValueChange={handleLanguageChange} 
                            defaultValue={field.value}
                            value={field.value}
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
                      className="w-full md:w-auto"
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('savingChanges')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('saveChanges')}
                        </>
                      )}
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
                  <form onSubmit={generalSettingsForm.handleSubmit(data => updateGeneralSettings.mutate(data))} className="space-y-4">
                    <FormField
                      control={generalSettingsForm.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('theme')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('selectTheme')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="light">
                                <div className="flex items-center">
                                  <Sun className="mr-2 h-4 w-4" />
                                  {t('lightTheme')}
                                </div>
                              </SelectItem>
                              <SelectItem value="dark">
                                <div className="flex items-center">
                                  <Moon className="mr-2 h-4 w-4" />
                                  {t('darkTheme')}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={generalSettingsForm.control}
                      name="defaultAsset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('defaultAsset')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
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
                              <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
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
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('selectTimeframe')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1m">1 {t('minute')}</SelectItem>
                              <SelectItem value="5m">5 {t('minutes')}</SelectItem>
                              <SelectItem value="15m">15 {t('minutes')}</SelectItem>
                              <SelectItem value="1h">1 {t('hour')}</SelectItem>
                              <SelectItem value="4h">4 {t('hours')}</SelectItem>
                              <SelectItem value="1d">1 {t('day')}</SelectItem>
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
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('selectChartType')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="candlestick">{t('candlestick')}</SelectItem>
                              <SelectItem value="line">{t('line')}</SelectItem>
                              <SelectItem value="bars">{t('bars')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={generalSettingsForm.control}
                      name="showTradingTips"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
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
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
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
                        <FormItem>
                          <FormLabel>{t('refreshInterval')} ({t('seconds')})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))} 
                              disabled={!generalSettingsForm.watch("autoRefreshData")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={updateGeneralSettings.isPending}
                    >
                      {updateGeneralSettings.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('savingChanges')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('saveChanges')}
                        </>
                      )}
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
                <Form {...notificationSettingsForm}>
                  <form onSubmit={notificationSettingsForm.handleSubmit(data => updateNotificationSettings.mutate(data))} className="space-y-4">
                    <FormField
                      control={notificationSettingsForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('emailNotifications')}</FormLabel>
                            <FormDescription>
                              {t('emailNotificationsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(value) => updateNotificationSetting('emailNotifications', value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('pushNotifications')}</FormLabel>
                            <FormDescription>
                              {t('pushNotificationsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(value) => updateNotificationSetting('pushNotifications', value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="signalAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('signalAlerts')}</FormLabel>
                            <FormDescription>
                              {t('signalAlertsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(value) => updateNotificationSetting('signalAlerts', value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="marketUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('marketUpdates')}</FormLabel>
                            <FormDescription>
                              {t('marketUpdatesDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(value) => updateNotificationSetting('marketUpdates', value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="accountAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('accountAlerts')}</FormLabel>
                            <FormDescription>
                              {t('accountAlertsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(value) => updateNotificationSetting('accountAlerts', value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="promotionalEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t('promotionalEmails')}</FormLabel>
                            <FormDescription>
                              {t('promotionalEmailsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(value) => updateNotificationSetting('promotionalEmails', value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={updateNotificationSettings.isPending}
                    >
                      {updateNotificationSettings.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('savingChanges')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('saveChanges')}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
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
                  <form onSubmit={apiSettingsForm.handleSubmit(data => updateApiSettings.mutate(data))} className="space-y-4">
                    <FormField
                      control={apiSettingsForm.control}
                      name="useAiForSignals"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
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
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
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
                        <FormItem>
                          <FormLabel>{t('openaiApiKey')}</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <div className="relative w-full">
                                <Input 
                                  type={showApiKey ? "text" : "password"} 
                                  {...field}
                                  disabled={!apiSettingsForm.watch("useCustomAiKey") || !apiSettingsForm.watch("useAiForSignals")}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  disabled={!apiSettingsForm.watch("useCustomAiKey") || !apiSettingsForm.watch("useAiForSignals")}
                                >
                                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                          </div>
                          <FormDescription>
                            {t('openaiApiKeyDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={updateApiSettings.isPending}
                    >
                      {updateApiSettings.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('savingChanges')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('saveChanges')}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}