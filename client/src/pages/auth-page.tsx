import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { AuthForms } from '@/components/auth/auth-forms';
import { useAuth } from '@/hooks/use-auth';
import { LineChart, TrendingUp, Activity, BarChart2, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // Ensure correct language is set
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Binarjoin Analytics | {t('login')}</title>
        <meta name="description" content="Access your account to view accurate binary options trading signals" />
      </Helmet>
      
      <Card className="w-full max-w-6xl grid md:grid-cols-2 overflow-hidden shadow-xl">
        {/* Auth Form Column */}
        <div className="p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/20">
              <LineChart className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Binarjoin Analytics</h1>
            <p className="text-muted-foreground">{t('analyticsTitle')}</p>
          </div>
          
          <AuthForms />
        </div>
        
        {/* Hero Column */}
        <div className="hidden md:flex bg-primary text-primary-foreground flex-col justify-center p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-foreground opacity-10" />
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6">{t('dashboardOverview')}</h2>
            <p className="mb-6 text-lg opacity-90">
              {t('analyticsTitle')}
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-white/20 p-2 rounded-lg mr-4">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t('signalAccuracyPercent', { percent: 90 })}</h3>
                  <p className="opacity-80">
                    {t('realtimeAlerts')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white/20 p-2 rounded-lg mr-4">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t('advancedAnalytics')}</h3>
                  <p className="opacity-80">
                    {t('technicalIndicators')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white/20 p-2 rounded-lg mr-4">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t('vipExclusiveSignals')}</h3>
                  <p className="opacity-80">
                    {t('privateConsultation')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute bottom-0 right-0 opacity-10">
            <TrendingUp className="h-64 w-64" />
          </div>
        </div>
      </Card>
    </div>
  );
}
