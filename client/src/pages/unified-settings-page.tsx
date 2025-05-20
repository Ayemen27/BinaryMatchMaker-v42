/**
 * صفحة الإعدادات الموحدة
 * واجهة مستخدم متكاملة لجميع إعدادات المستخدم مع تحسينات الواجهة
 */

import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Helmet } from "react-helmet";
import { Layout } from "@/components/layout/layout";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { AccountInfoCard } from "@/components/settings/account-info-card";
import { StatsDashboard } from "@/components/settings/stats-dashboard";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { useSettings } from "@/lib/settings-manager";
import { Loader2 } from "lucide-react";

// مكونات ShadCN
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UnifiedSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { allSettings, isLoading } = useSettings();
  
  // إذا لم يكن المستخدم مسجل دخوله، قم بتوجيهه إلى صفحة تسجيل الدخول
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <Layout>
      <Helmet>
        <title>{t('settings')} | Binarjoin Analytics</title>
        <meta name="description" content={t('settingsDescription')} />
      </Helmet>
      
      <div className="p-3 md:p-6 max-w-7xl mx-auto">
        {/* رأس الصفحة */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{t('settings')}</h1>
            <p className="text-muted-foreground">{t('settingsDescription')}</p>
          </div>
          
          {/* زر ربما نضيفه لاحقًا: استعادة الإعدادات الافتراضية */}
          {/* <Button variant="outline" size="sm" className="mt-4 md:mt-0">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('restoreDefaults')}
          </Button> */}
        </div>
        
        {/* محتوى الصفحة */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* معلومات الحساب في الجانب */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 border rounded-lg bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <AccountInfoCard userData={allSettings?.user} className="mb-6" />
                
                {/* لوحة الإحصائيات */}
                <StatsDashboard userData={allSettings?.user} className="mb-6" />
                
                {/* مبدل اللغة */}
                <LanguageSwitcher 
                  className="mb-6" 
                  onLanguageChange={(lng) => {
                    // تحديث اللغة في التخزين المحلي فقط دون محاولة تحديث البيانات
                    console.log("تم تغيير اللغة إلى:", lng);
                    // سيتم حفظ اللغة في وظيفة handleLanguageChange داخل مكون LanguageSwitcher
                  }}
                />
                
                {/* نصائح وإرشادات */}
                <Alert className="bg-gradient-to-r from-blue-500/10 to-blue-400/5 border-blue-200 dark:border-blue-900">
                  <AlertDescription>
                    <p className="text-sm leading-relaxed">
                      {t('settingsTip')}
                    </p>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
          
          {/* علامات تبويب الإعدادات في القسم الرئيسي */}
          <div className="lg:col-span-8 xl:col-span-9">
            <SettingsTabs />
          </div>
        </div>
      </div>
    </Layout>
  );
}