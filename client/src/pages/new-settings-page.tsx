/**
 * صفحة الإعدادات الجديدة المبسطة
 * تستخدم نظام إدارة الإعدادات الجديد لتحسين موثوقية حفظ الإعدادات
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { useAuth } from '@/hooks/use-auth';
import { Helmet } from 'react-helmet';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  User, Lock, Bell, CreditCard, Globe, Key, 
  Settings2
} from 'lucide-react';

// استيراد المكون الجديد للإعدادات العامة
import { SimpleSettingsTab } from '@/components/settings/simple-settings-tab';

export default function NewSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  // تتبع التبويب النشط
  const [activeTab, setActiveTab] = useState<string>("general");
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('settings')}</title>
        <meta name="description" content={t('settingsDescription') || 'إدارة إعدادات الحساب والإشعارات'} />
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

        <Tabs defaultValue="general" className="space-y-4" onValueChange={(value) => setActiveTab(value)}>
          {/* قائمة علامات التبويب */}
          <div className="overflow-x-auto pb-2 mb-4">
            <div className="min-w-max">
              <TabsList className="flex border border-border p-1 rounded-lg bg-card">
                <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <User className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('profile')}</span>
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('general') || 'الإعدادات العامة'}</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <Lock className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('security')}</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <Bell className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('notifications')}</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('subscription')}</span>
                </TabsTrigger>
                <TabsTrigger value="language" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <Globe className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('language')}</span>
                </TabsTrigger>
                <TabsTrigger value="apikeys" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
                  <Key className="h-4 w-4" />
                  <span className="hidden xs:inline">{t('apiKeys') || 'مفاتيح API'}</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          {/* محتوى التبويبات */}
          <TabsContent value="general" className="space-y-6">
            <SimpleSettingsTab />
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg">
              <p className="text-muted-foreground">{t('comingSoon') || 'قريباً...'}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg">
              <p className="text-muted-foreground">{t('comingSoon') || 'قريباً...'}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg">
              <p className="text-muted-foreground">{t('comingSoon') || 'قريباً...'}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="subscription" className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg">
              <p className="text-muted-foreground">{t('comingSoon') || 'قريباً...'}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="language" className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg">
              <p className="text-muted-foreground">{t('comingSoon') || 'قريباً...'}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="apikeys" className="space-y-6">
            <div className="flex items-center justify-center p-12 border rounded-lg">
              <p className="text-muted-foreground">{t('comingSoon') || 'قريباً...'}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}