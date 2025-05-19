import { Layout } from '@/components/layout/layout';
import { SettingsForm } from '@/components/settings/settings-form';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Redirect } from 'wouter';

export default function UserSettingsTestPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // التأكد من تسجيل دخول المستخدم
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <Layout>
      <Helmet>
        <title>اختبار إعدادات المستخدم | Binarjoin Analytics</title>
        <meta name="description" content="اختبار إعدادات المستخدم وحفظها في قاعدة البيانات" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{t('userSettings') || 'إعدادات المستخدم'}</h1>
            <p className="text-muted-foreground">{t('userSettingsDescription') || 'إدارة وتخصيص إعداداتك'}</p>
          </div>
        </div>
        
        <div className="grid gap-6">
          {/* نموذج الإعدادات */}
          <SettingsForm />
        </div>
      </div>
    </Layout>
  );
}