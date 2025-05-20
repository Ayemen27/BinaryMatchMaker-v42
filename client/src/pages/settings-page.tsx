import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { useAuth } from '@/hooks/use-auth';
import { GeneralSettings } from '@/components/settings/general-settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Check, Globe, Lock, User, Bell, CreditCard, Settings, Loader2, Key, Info,
  Save, Trash2, Eye, CheckCircle2, ExternalLink, HelpCircle, BrainCircuit, LockKeyhole,
  Settings2, Thermometer, FileWarning, Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { NotificationSettings } from '@/types';

import { Helmet } from 'react-helmet';

// تعريف نوع إعدادات المستخدم كما يتم إرجاعه من الخادم
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
  useAiForSignals: boolean;
  useCustomAiKey: boolean;
  hasCustomApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

// تعريف مخطط إعدادات المستخدم
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

const profileFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  fullName: z.string().optional(),
});

const apiKeyFormSchema = z.object({
  openaiApiKey: z.string().min(1, {
    message: "مفتاح API مطلوب",
  }),
  useCustomAiKey: z.boolean().default(false),
  useAiForSignals: z.boolean().default(true),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  newPassword: z.string().min(6, {
    message: "New password must be at least 6 characters.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Confirm password must be at least 6 characters.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

// تعريف أيقونة المصباح
const LightbulbIcon = FileWarning;

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // إضافة متغير لتتبع التبويب النشط
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  
  // استعلام لجلب إعدادات المستخدم من الخادم
  const { data: userSettingsData, isLoading: isLoadingSettings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    enabled: !!user, // تفعيل الاستعلام فقط إذا كان المستخدم مسجل دخوله
    staleTime: 0, // عدم استخدام البيانات المخزنة مؤقتًا
    gcTime: 0, // عدم تخزين البيانات بشكل مؤقت (استبدلنا cacheTime بـ gcTime في الإصدار الجديد)
    onSuccess: (data) => {
      console.log('تم جلب إعدادات المستخدم بنجاح:', data);
      
      // تحديث إعدادات واجهة المستخدم عند جلب البيانات بنجاح
      if (data) {
        // تحديث نموذج إعدادات المستخدم
        settingsForm.reset({
          theme: data.theme || 'dark',
          defaultAsset: data.defaultAsset || 'BTC/USDT',
          defaultTimeframe: data.defaultTimeframe || '1h',
          defaultPlatform: data.defaultPlatform || '',
          chartType: data.chartType || 'candlestick',
          showTradingTips: data.showTradingTips ?? true,
          autoRefreshData: data.autoRefreshData ?? true,
          refreshInterval: data.refreshInterval || 60,
        });
      }
    },
    onError: (error) => {
      console.error('خطأ في جلب إعدادات المستخدم:', error);
      toast({
        title: t('loadingError') || 'خطأ في التحميل',
        description: t('settingsLoadError') || 'حدث خطأ أثناء تحميل الإعدادات',
        variant: "destructive",
      });
    }
  });
  
  // نموذج إعدادات المستخدم العامة
  const settingsForm = useForm<{
    theme: string;
    defaultAsset: string;
    defaultTimeframe: string;
    defaultPlatform: string;
    chartType: string;
    showTradingTips: boolean;
    autoRefreshData: boolean;
    refreshInterval: number;
  }>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      theme: 'dark',
      defaultAsset: 'BTC/USDT',
      defaultTimeframe: '1h',
      defaultPlatform: '',
      chartType: 'candlestick',
      showTradingTips: true,
      autoRefreshData: true,
      refreshInterval: 60,
    },
  });
  
  // استخدام حالة لإعدادات الإشعارات
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    signalGeneration: true,
    signalResults: true,
    marketAlerts: false,
    accountAlerts: true,
  });
  
  // API Key form
  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      openaiApiKey: '',
      useCustomAiKey: false,
      useAiForSignals: true,
    },
  });

  // تحديث نموذج API بناءً على البيانات المستردة
  useEffect(() => {
    if (userSettingsData) {
      apiKeyForm.reset({
        openaiApiKey: '', // لا يتم إرجاع مفتاح API في الاستجابة لأسباب أمنية
        useCustomAiKey: userSettingsData.useCustomAiKey || false,
        useAiForSignals: userSettingsData.useAiForSignals || true,
      });
    }
  }, [userSettingsData, apiKeyForm]);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      fullName: user?.fullName || '',
    },
  });
  
  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  // لا نحتاج إلى نموذج إضافي للإعدادات العامة، نستخدم فقط النموذج الأساسي settingsForm

  // إتاحة تعديلات الإعدادات - تم تغيير الطريقة من PATCH إلى PUT لتتوافق مع الخلفية
  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('إرسال إعدادات للخادم باستخدام PUT:', data);
      
      // إضافة علامة وقت للتأكد من عدم استخدام الذاكرة المؤقتة
      const timestampedUrl = `/api/user/settings?ts=${Date.now()}`;
      const response = await apiRequest("PUT", timestampedUrl, data);
      
      // التحقق من الاستجابة
      if (!response.ok) {
        // محاولة الحصول على رسالة الخطأ من الاستجابة
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'فشل تحديث الإعدادات';
        } catch (e) {
          errorMessage = 'فشل تحديث الإعدادات: خطأ غير معروف';
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('تم استلام استجابة ناجحة من الخادم:', data);
      
      // حفظ الإعدادات في التخزين المحلي للاستخدام في حالة الاتصال غير المتوفر
      try {
        localStorage.setItem('userSettings', JSON.stringify(data));
        console.log('تم حفظ الإعدادات المحدثة في التخزين المحلي');
      } catch (error) {
        console.error('خطأ في حفظ الإعدادات في التخزين المحلي:', error);
      }
      
      // إلغاء الذاكرة المؤقتة وإعادة تحميل البيانات
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
      
      toast({
        title: t('settingsUpdated') || 'تم تحديث الإعدادات',
        description: t('settingsUpdateSuccess') || 'تم حفظ الإعدادات بنجاح',
      });
    },
    onError: (error: Error) => {
      console.error('خطأ في تحديث الإعدادات:', error);
      toast({
        title: t('updateFailed') || 'فشل التحديث',
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // دالة لحفظ الإعدادات عند تغييرها
  const saveSettings = (data: any) => {
    settingsMutation.mutate(data);
  };

  // Profile mutation
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: t('profileUpdated'),
        description: t('profileUpdateSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('updateFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Password mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const res = await apiRequest("PATCH", "/api/user/password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('passwordChanged'),
        description: t('passwordChangeSuccess'),
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t('changeFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Language mutation
  const languageMutation = useMutation({
    mutationFn: async (language: string) => {
      const res = await apiRequest("PATCH", "/api/user/language", { language });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('languageChanged'),
        description: t('languageChangeSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('changeFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Notifications mutation
  const notificationsMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      const res = await apiRequest("PATCH", "/api/user/notifications", settings);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('notificationsUpdated'),
        description: t('notificationsUpdateSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('updateFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // API Key mutation
  const apiKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyFormValues) => {
      const res = await apiRequest("PATCH", "/api/user/settings/api", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: t('apiKeyUpdated') || 'تم تحديث مفتاح API',
        description: t('apiKeyUpdateSuccess') || 'تم تحديث إعدادات API بنجاح',
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('updateFailed') || 'فشل التحديث',
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Submit handlers
  const onProfileSubmit = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };
  
  const onPasswordSubmit = (data: PasswordFormValues) => {
    passwordMutation.mutate(data);
  };
  
  const onApiKeySubmit = (data: ApiKeyFormValues) => {
    apiKeyMutation.mutate(data);
  };
  
  const handleLanguageChange = (language: 'ar' | 'en') => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    // Also update in the backend
    languageMutation.mutate(language);
  };
  
  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    const updatedSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(updatedSettings);
    notificationsMutation.mutate(updatedSettings);
  };
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('settings')}</title>
        <meta name="description" content="Manage your account settings, profile and notification preferences" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{t('settings')}</h1>
            <p className="text-muted-foreground">{t('manageYourAccount')}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="inline-flex items-center gap-2 bg-card py-1 px-2 rounded-full text-xs text-muted-foreground border">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {user?.username}
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4" onValueChange={(value) => setActiveTab(value)}>
          {/* تصميم جديد متوافق مع جميع أحجام الشاشات */}
          <div className="overflow-x-auto pb-2 mb-4">
            <div className="min-w-max">
              <TabsList className="flex border border-border p-1 rounded-lg bg-card">
                <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="profile">
                  <User className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('profile')}</span>
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="general">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('general') || 'الإعدادات العامة'}</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="security">
                  <Lock className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('security')}</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="notifications">
                  <Bell className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('notifications')}</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="subscription">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('subscription')}</span>
                </TabsTrigger>
                <TabsTrigger value="language" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="language">
                  <Globe className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('language')}</span>
                </TabsTrigger>
                <TabsTrigger value="apikeys" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md" data-value="apikeys">
                  <Key className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('apiKeys') || 'مفاتيح API'}</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          {/* شريط عنوان القسم النشط - مع استخدام الأيقونات المناسبة للقسم النشط */}
          <div className="bg-muted/30 p-3 rounded-lg border border-border mb-4">
            <div className="flex items-center gap-2">
              {activeTab === 'profile' ? <User className="h-5 w-5 text-primary" /> :
               activeTab === 'security' ? <Lock className="h-5 w-5 text-primary" /> :
               activeTab === 'notifications' ? <Bell className="h-5 w-5 text-primary" /> :
               activeTab === 'subscription' ? <CreditCard className="h-5 w-5 text-primary" /> :
               activeTab === 'language' ? <Globe className="h-5 w-5 text-primary" /> :
               activeTab === 'apikeys' ? <Key className="h-5 w-5 text-primary" /> :
               <Settings className="h-5 w-5 text-primary" />}
              
              <div>
                <h2 className="text-lg font-semibold">
                  {activeTab === 'profile' ? t('profile') :
                   activeTab === 'security' ? t('security') :
                   activeTab === 'notifications' ? t('notifications') :
                   activeTab === 'subscription' ? t('subscription') :
                   activeTab === 'language' ? t('language') :
                   activeTab === 'apikeys' ? (t('apiKeys') || 'مفاتيح API') :
                   t('settings')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeTab === 'profile' ? (t('profileDescription') || 'تعديل معلومات الملف الشخصي') :
                   activeTab === 'security' ? (t('securityDescription') || 'إعدادات الأمان وكلمة المرور') :
                   activeTab === 'notifications' ? (t('notificationsDescription') || 'إدارة إعدادات الإشعارات') :
                   activeTab === 'subscription' ? (t('subscriptionDescription') || 'إدارة اشتراكك وطرق الدفع') :
                   activeTab === 'language' ? (t('languageDescription') || 'تغيير لغة التطبيق') :
                   activeTab === 'apikeys' ? (t('apiKeysDescription') || 'إدارة مفاتيح API للذكاء الاصطناعي') :
                   t('manageYourAccount')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="border border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t('profileSettings')}</CardTitle>
                    <CardDescription>{t('profileSettingsDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="bg-primary/5 p-4 rounded-lg mb-6 flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('profileInfoMessage') || 'هذه المعلومات ستظهر في حسابك الشخصي وستكون مرئية للإدارة فقط.'}</p>
                </div>
                
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                              <Input {...field} className="border-border focus-visible:ring-primary" />
                            </FormControl>
                            <FormDescription className="text-xs">{t('usernameDescription') || 'اسم المستخدم الخاص بك للدخول إلى النظام'}</FormDescription>
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
                              <Input type="email" {...field} className="border-border focus-visible:ring-primary" />
                            </FormControl>
                            <FormDescription className="text-xs">{t('emailDescription') || 'البريد الإلكتروني المستخدم للإشعارات والتواصل'}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('fullName')}</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-border focus-visible:ring-primary" />
                          </FormControl>
                          <FormDescription className="text-xs">{t('fullNameDescription') || 'الاسم الكامل الذي سيظهر في حسابك'}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4 border-t border-border mt-6">
                      <Button 
                        type="submit"
                        disabled={profileMutation.isPending}
                        className="relative overflow-hidden group"
                      >
                        {profileMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                        )}
                        {t('saveChanges')}
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="border border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t('securitySettings')}</CardTitle>
                    <CardDescription>{t('securitySettingsDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="bg-yellow-500/10 p-4 rounded-lg mb-6 flex items-center gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-full">
                    <Info className="h-4 w-4 text-yellow-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('passwordWarning') || 'تأكد من استخدام كلمة مرور قوية وفريدة لحماية حسابك.'}</p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-lg font-medium mb-4">{t('changePassword') || 'تغيير كلمة المرور'}</h3>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('currentPassword')}</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} className="border-border focus-visible:ring-primary" />
                              </FormControl>
                              <FormDescription className="text-xs">{t('currentPasswordDescription') || 'أدخل كلمة المرور الحالية للتحقق'}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('newPassword')}</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} className="border-border focus-visible:ring-primary" />
                              </FormControl>
                              <FormDescription className="text-xs">{t('passwordRequirements') || 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('confirmPassword')}</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} className="border-border focus-visible:ring-primary" />
                              </FormControl>
                              <FormDescription className="text-xs">{t('confirmPasswordDescription') || 'أعد إدخال كلمة المرور الجديدة للتأكيد'}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="pt-4 mt-2">
                        <Button 
                          type="submit"
                          disabled={passwordMutation.isPending}
                          className="relative overflow-hidden group"
                        >
                          {passwordMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                          )}
                          {t('changePassword')}
                          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-5 mt-6">
                  <h3 className="text-lg font-medium mb-4">{t('additionalSecurity') || 'إعدادات الأمان الإضافية'}</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div>
                        <p className="font-medium">{t('twoFactorAuthTitle') || 'المصادقة الثنائية'}</p>
                        <p className="text-sm text-muted-foreground">{t('twoFactorAuthDescription') || 'تمكين المصادقة ثنائية العوامل لحماية إضافية للحساب'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="two-factor" className="data-[state=checked]:bg-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {t('inactive') || 'غير مفعل'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t('loginHistory') || 'سجل تسجيلات الدخول'}</p>
                        <p className="text-sm text-muted-foreground">{t('loginHistoryDescription') || 'مراجعة نشاط تسجيل الدخول الأخير لحسابك'}</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-primary/20 hover:border-primary/50">
                        {t('viewHistory') || 'عرض السجل'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t('notificationSettings')}</CardTitle>
                <CardDescription>{t('notificationSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('notificationChannels')}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('emailNotifications')}</p>
                      <p className="text-sm text-muted-foreground">{t('emailNotificationsDescription')}</p>
                    </div>
                    <Switch 
                      id="email-notifications" 
                      checked={notificationSettings.email}
                      onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('pushNotifications')}</p>
                      <p className="text-sm text-muted-foreground">{t('pushNotificationsDescription')}</p>
                    </div>
                    <Switch 
                      id="push-notifications" 
                      checked={notificationSettings.push}
                      onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                    />
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <h3 className="text-lg font-medium">{t('notificationTypes')}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('signalGenerationAlerts')}</p>
                      <p className="text-sm text-muted-foreground">{t('signalGenerationAlertsDescription')}</p>
                    </div>
                    <Switch 
                      id="signal-generation" 
                      checked={notificationSettings.signalGeneration}
                      onCheckedChange={(checked) => handleNotificationChange('signalGeneration', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('signalResultsAlerts')}</p>
                      <p className="text-sm text-muted-foreground">{t('signalResultsAlertsDescription')}</p>
                    </div>
                    <Switch 
                      id="signal-results" 
                      checked={notificationSettings.signalResults}
                      onCheckedChange={(checked) => handleNotificationChange('signalResults', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('marketAlerts')}</p>
                      <p className="text-sm text-muted-foreground">{t('marketAlertsDescription')}</p>
                    </div>
                    <Switch 
                      id="market-alerts" 
                      checked={notificationSettings.marketAlerts}
                      onCheckedChange={(checked) => handleNotificationChange('marketAlerts', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('accountAlerts')}</p>
                      <p className="text-sm text-muted-foreground">{t('accountAlertsDescription')}</p>
                    </div>
                    <Switch 
                      id="account-alerts" 
                      checked={notificationSettings.accountAlerts}
                      onCheckedChange={(checked) => handleNotificationChange('accountAlerts', checked)}
                    />
                  </div>
                  
                  <Button 
                    className="mt-6"
                    onClick={() => notificationsMutation.mutate(notificationSettings)}
                    disabled={notificationsMutation.isPending}
                  >
                    {notificationsMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t('saveNotificationSettings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>{t('yourSubscription')}</CardTitle>
                <CardDescription>{t('subscriptionSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="bg-warning/20 text-warning rounded-full p-2 ml-3">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{t('freeSubscription')}</h3>
                      <p className="text-xs text-muted-foreground">{t('remainingSignals', { count: 3 })}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-success mr-2" />
                      <span className="text-sm">{t('limitedSignals', { count: 10 })}</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-success mr-2" />
                      <span className="text-sm">{t('basicMarketAnalysis')}</span>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4">
                    {t('upgradePlan')}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('billingInformation')}</h3>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('noBillingInformation')}</p>
                  </div>
                  
                  <h3 className="text-lg font-medium">{t('paymentHistory')}</h3>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('noPaymentHistory')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Language Tab */}
          <TabsContent value="language">
            <Card className="border border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t('languageSettings')}</CardTitle>
                    <CardDescription>{t('languageSettingsDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="bg-primary/5 p-4 rounded-lg mb-6 flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('languageInfoMessage') || 'اختيار اللغة سيؤثر على واجهة المستخدم والإشعارات والرسائل.'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`relative p-1 border rounded-lg cursor-pointer transition-all overflow-hidden ${i18n.language === 'ar' ? 'border-primary shadow-sm shadow-primary/20' : 'border-border hover:border-primary/40'}`}
                    onClick={() => handleLanguageChange('ar')}
                  >
                    {i18n.language === 'ar' && (
                      <div className="absolute right-0 top-0 h-6 px-3 text-xs bg-primary text-white rounded-bl-md rounded-tr-md flex items-center justify-center">
                        {t('active') || 'نشط'}
                      </div>
                    )}
                    
                    <div className={`flex items-center gap-4 p-4 rounded-md ${i18n.language === 'ar' ? 'bg-primary/5' : ''}`}>
                      <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">ع</span>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-xl font-medium mb-1">العربية</h3>
                        <p className="text-sm text-muted-foreground">Arabic</p>
                        {i18n.language === 'ar' && (
                          <div className="mt-2 inline-flex items-center text-primary text-sm">
                            <Check className="h-4 w-4 mr-1" />
                            {t('currentLanguage') || 'اللغة الحالية'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`relative p-1 border rounded-lg cursor-pointer transition-all overflow-hidden ${i18n.language === 'en' ? 'border-primary shadow-sm shadow-primary/20' : 'border-border hover:border-primary/40'}`}
                    onClick={() => handleLanguageChange('en')}
                  >
                    {i18n.language === 'en' && (
                      <div className="absolute right-0 top-0 h-6 px-3 text-xs bg-primary text-white rounded-bl-md rounded-tr-md flex items-center justify-center">
                        {t('active') || 'نشط'}
                      </div>
                    )}
                    
                    <div className={`flex items-center gap-4 p-4 rounded-md ${i18n.language === 'en' ? 'bg-primary/5' : ''}`}>
                      <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">En</span>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-xl font-medium mb-1">English</h3>
                        <p className="text-sm text-muted-foreground">الإنجليزية</p>
                        {i18n.language === 'en' && (
                          <div className="mt-2 inline-flex items-center text-primary text-sm">
                            <Check className="h-4 w-4 mr-1" />
                            {t('currentLanguage') || 'اللغة الحالية'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-5 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-medium">{t('advancedSettings') || 'إعدادات إضافية'}</h3>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
                      <div>
                        <p className="font-medium">{t('dateTimeFormat') || 'تنسيق التاريخ والوقت'}</p>
                        <p className="text-xs text-muted-foreground">{t('dateTimeFormatDescription') || 'تنسيق عرض التاريخ والوقت'}</p>
                      </div>
                      <select className="w-full sm:w-auto border border-border rounded-md h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary bg-background text-sm">
                        <option value="auto">{t('systemDefault') || 'افتراضي النظام'}</option>
                        <option value="ar">التنسيق العربي</option>
                        <option value="en">English Format</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{t('numberFormat') || 'تنسيق الأرقام'}</p>
                        <p className="text-xs text-muted-foreground">{t('numberFormatDescription') || 'نوع الأرقام المستخدمة'}</p>
                      </div>
                      <select className="w-full sm:w-auto border border-border rounded-md h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary bg-background text-sm">
                        <option value="auto">{t('followLanguage') || 'حسب اللغة'}</option>
                        <option value="arabic">١٢٣٤٥ (عربية)</option>
                        <option value="latin">12345 (لاتينية)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* API Keys Tab */}
          <TabsContent value="apikeys">
            <Card>
              <CardHeader>
                <CardTitle>{t('apiKeysSettings') || 'إعدادات مفاتيح API'}</CardTitle>
                <CardDescription>{t('apiKeysSettingsDescription') || 'إدارة مفاتيح API الخاصة بك لتوليد الإشارات باستخدام الذكاء الاصطناعي'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-md border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{t('whatIsApiKey') || 'ما هو مفتاح API؟'}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('apiKeyExplanation') || 'مفتاح API هو رمز فريد يسمح لك باستخدام خدمات الذكاء الاصطناعي من OpenAI لتوليد إشارات تداول دقيقة. عند استخدام مفتاحك الخاص، يمكنك:'}
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-2">
                    <li>{t('apiKeyBenefit1') || 'الحصول على إشارات غير محدودة دون قيود'}</li>
                    <li>{t('apiKeyBenefit2') || 'تحسين دقة الإشارات وتخصيصها لاحتياجاتك'}</li>
                    <li>{t('apiKeyBenefit3') || 'تشغيل التطبيق حتى عندما يكون هناك ضغط كبير على خوادم النظام'}</li>
                  </ul>
                </div>
                
                <Form {...apiKeyForm}>
                  <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-4">
                    <FormField
                      control={apiKeyForm.control}
                      name="useAiForSignals"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {t('useAiForSignals') || 'استخدام الذكاء الاصطناعي لتوليد الإشارات'}
                            </FormLabel>
                            <FormDescription>
                              {t('useAiForSignalsDescription') || 'عند التعطيل، سيتم استخدام خوارزميات تقليدية لتوليد الإشارات بدلاً من الذكاء الاصطناعي'}
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
                      control={apiKeyForm.control}
                      name="useCustomAiKey"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {t('useCustomAiKey') || 'استخدام مفتاح OpenAI خاص'}
                            </FormLabel>
                            <FormDescription>
                              {t('useCustomAiKeyDescription') || 'استخدم مفتاح API الخاص بك للاتصال بـ OpenAI بدلاً من مفتاح النظام'}
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
                    
                    {apiKeyForm.watch('useCustomAiKey') && (
                      <FormField
                        control={apiKeyForm.control}
                        name="openaiApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('openaiApiKey') || 'مفتاح OpenAI API'}</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showApiKey ? "text" : "password"} 
                                  placeholder="sk-..." 
                                  {...field} 
                                />
                              </FormControl>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? t('hide') || 'إخفاء' : t('show') || 'إظهار'}
                              </Button>
                            </div>
                            <FormDescription>
                              {t('openaiApiKeyDescription') || 'أدخل مفتاح API الخاص بك من حساب OpenAI. نحن لا نخزن هذا المفتاح على خوادمنا.'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <div className="bg-muted p-4 rounded-md border border-border mt-4">
                      <h3 className="font-medium mb-2">{t('howToGetApiKey') || 'كيفية الحصول على مفتاح API'}</h3>
                      <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                        <li>{t('apiKeyStep1') || 'قم بزيارة موقع OpenAI على'} <a href="https://platform.openai.com/signup" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a></li>
                        <li>{t('apiKeyStep2') || 'سجل حساباً أو قم بتسجيل الدخول إلى حسابك الحالي'}</li>
                        <li>{t('apiKeyStep3') || 'انتقل إلى صفحة "API Keys" في الإعدادات'}</li>
                        <li>{t('apiKeyStep4') || 'اضغط على "Create new secret key" وقم بتسمية المفتاح'}</li>
                        <li>{t('apiKeyStep5') || 'انسخ المفتاح المُنشأ والصقه هنا'}</li>
                      </ol>
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>{t('important') || 'هام'}:</strong> {t('apiKeyWarning') || 'تحتاج إلى إضافة طريقة دفع إلى حسابك في OpenAI لاستخدام المفتاح. سيتم تحصيل رسوم منك مباشرةً من قبل OpenAI حسب استخدامك.'}
                      </p>
                    </div>
                    
                    <Button 
                      type="submit"
                      disabled={apiKeyMutation.isPending}
                      className="mt-4"
                    >
                      {apiKeyMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t('saveApiSettings') || 'حفظ إعدادات API'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
