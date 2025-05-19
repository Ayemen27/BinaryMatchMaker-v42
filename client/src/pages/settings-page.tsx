import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { useAuth } from '@/hooks/use-auth';
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
import { Check, Globe, Lock, User, Bell, CreditCard, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { NotificationSettings } from '@/types';
import { Helmet } from 'react-helmet';

const profileFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  fullName: z.string().optional(),
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

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    signalGeneration: true,
    signalResults: true,
    marketAlerts: false,
    accountAlerts: true,
  });
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || '',
      email: '',
      fullName: '',
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
  
  // Submit handlers
  const onProfileSubmit = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };
  
  const onPasswordSubmit = (data: PasswordFormValues) => {
    passwordMutation.mutate(data);
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
    // notificationsMutation.mutate(updatedSettings);
  };
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('settings')}</title>
        <meta name="description" content="Manage your account settings, profile and notification preferences" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('settings')}</h1>
            <p className="text-muted-foreground">{t('manageYourAccount')}</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="w-full sm:w-auto border-b-0 bg-card">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              {t('profile')}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              {t('security')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              {t('notifications')}
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              {t('subscription')}
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              {t('language')}
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('profileSettings')}</CardTitle>
                <CardDescription>{t('profileSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
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
                            <Input type="email" {...field} />
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
                    
                    <Button 
                      type="submit"
                      disabled={profileMutation.isPending}
                    >
                      {profileMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t('saveChanges')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('securitySettings')}</CardTitle>
                <CardDescription>{t('securitySettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('currentPassword')}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('newPassword')}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
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
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit"
                      disabled={passwordMutation.isPending}
                    >
                      {passwordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t('changePassword')}
                    </Button>
                  </form>
                </Form>
                
                <Separator className="my-6" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('twoFactorAuth')}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('twoFactorAuthTitle')}</p>
                      <p className="text-sm text-muted-foreground">{t('twoFactorAuthDescription')}</p>
                    </div>
                    <Switch id="two-factor" />
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
            <Card>
              <CardHeader>
                <CardTitle>{t('languageSettings')}</CardTitle>
                <CardDescription>{t('languageSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={i18n.language === 'ar' ? 'default' : 'outline'}
                    className="h-auto p-4 justify-start"
                    onClick={() => handleLanguageChange('ar')}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                        <span className="text-lg">ع</span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">العربية</div>
                        <div className="text-sm text-muted-foreground">Arabic</div>
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    variant={i18n.language === 'en' ? 'default' : 'outline'}
                    className="h-auto p-4 justify-start"
                    onClick={() => handleLanguageChange('en')}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                        <span className="text-lg">E</span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">English</div>
                        <div className="text-sm text-muted-foreground">English</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
