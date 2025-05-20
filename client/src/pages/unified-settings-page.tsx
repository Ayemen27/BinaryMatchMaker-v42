/**
 * صفحة الإعدادات الموحدة
 * واجهة مستخدم متكاملة لجميع إعدادات المستخدم
 */

import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Helmet } from "react-helmet";
import { Layout } from "@/components/layout/layout";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default function UnifiedSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
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
      
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{t('settings')}</h1>
            <p className="text-muted-foreground">{t('settingsDescription')}</p>
          </div>
        </div>
        
        <SettingsTabs />
      </div>
    </Layout>
  );
}