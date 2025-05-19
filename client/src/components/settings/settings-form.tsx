import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { UserSettings, defaultSettings, updateUserSettings, getUserSettings } from '@/lib/user-settings-api';

// مكون نموذج الإعدادات - هذا المكون يمكن استخدامه في أي مكان لتحديث إعدادات المستخدم
export function SettingsForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // جلب إعدادات المستخدم عند تحميل المكون
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const userSettings = await getUserSettings();
        setSettings(userSettings);
      } catch (error) {
        console.error('خطأ في جلب الإعدادات:', error);
        toast({
          title: t('loadingError') || 'خطأ في التحميل',
          description: t('settingsLoadError') || 'لم نتمكن من تحميل إعداداتك. سيتم استخدام الإعدادات الافتراضية.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [t, toast]);
  
  // تحديث حالة الإعدادات المحلية
  const handleChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // حفظ التغييرات في الخادم
  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUserSettings(settings);
      toast({
        title: t('settingsUpdated') || 'تم تحديث الإعدادات',
        description: t('settingsUpdateSuccess') || 'تم حفظ إعداداتك بنجاح',
      });
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast({
        title: t('updateFailed') || 'فشل التحديث',
        description: t('updateFailedMessage') || 'لم نتمكن من حفظ إعداداتك. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  // تحديث إعداد واحد فوراً على الخادم
  const updateSingle = async (key: keyof UserSettings, value: any) => {
    try {
      // تحديث الواجهة أولاً
      handleChange(key, value);
      
      // حفظ التغيير
      await updateUserSettings({ [key]: value });
      
      toast({
        title: t('settingUpdated') || 'تم تحديث الإعداد',
        description: t('singleSettingUpdateSuccess') || 'تم حفظ التغيير بنجاح',
      });
    } catch (error) {
      console.error(`فشل تحديث الإعداد ${key}:`, error);
      // استعادة القيمة القديمة في حالة الفشل
      setSettings(prev => ({ ...prev }));
      toast({
        title: t('updateFailed') || 'فشل التحديث',
        description: t('updateFailedMessage') || 'لم نتمكن من حفظ التغيير. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="bg-muted/30 border-b border-border">
        <CardTitle>{t('generalSettings') || 'الإعدادات العامة'}</CardTitle>
        <CardDescription>{t('generalSettingsDescription') || 'تخصيص إعدادات التطبيق والتفضيلات'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="theme">{t('theme') || 'السمة'}</Label>
            <select 
              id="theme"
              className="w-full p-2 border border-border rounded-md bg-card"
              value={settings.theme}
              onChange={(e) => updateSingle('theme', e.target.value)}
            >
              <option value="dark">{t('darkTheme') || 'السمة الداكنة'}</option>
              <option value="light">{t('lightTheme') || 'السمة الفاتحة'}</option>
              <option value="system">{t('systemTheme') || 'سمة النظام'}</option>
            </select>
            <p className="text-xs text-muted-foreground">{t('themeDescription') || 'تغيير مظهر التطبيق'}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="defaultAsset">{t('defaultAsset') || 'الأصل الافتراضي'}</Label>
            <select 
              id="defaultAsset"
              className="w-full p-2 border border-border rounded-md bg-card"
              value={settings.defaultAsset}
              onChange={(e) => updateSingle('defaultAsset', e.target.value)}
            >
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="XRP/USDT">XRP/USDT</option>
              <option value="SOL/USDT">SOL/USDT</option>
              <option value="DOGE/USDT">DOGE/USDT</option>
            </select>
            <p className="text-xs text-muted-foreground">{t('defaultAssetDescription') || 'الأصل الافتراضي عند فتح التطبيق'}</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaultTimeframe">{t('defaultTimeframe') || 'الإطار الزمني الافتراضي'}</Label>
            <select 
              id="defaultTimeframe"
              className="w-full p-2 border border-border rounded-md bg-card"
              value={settings.defaultTimeframe}
              onChange={(e) => updateSingle('defaultTimeframe', e.target.value)}
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
            <p className="text-xs text-muted-foreground">{t('defaultTimeframeDescription') || 'الإطار الزمني الافتراضي للرسوم البيانية'}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chartType">{t('chartType') || 'نوع الرسم البياني'}</Label>
            <select 
              id="chartType"
              className="w-full p-2 border border-border rounded-md bg-card"
              value={settings.chartType}
              onChange={(e) => updateSingle('chartType', e.target.value)}
            >
              <option value="candlestick">{t('candlestick') || 'الشموع اليابانية'}</option>
              <option value="line">{t('line') || 'خط'}</option>
              <option value="bar">{t('bar') || 'أعمدة'}</option>
              <option value="area">{t('area') || 'مساحة'}</option>
            </select>
            <p className="text-xs text-muted-foreground">{t('chartTypeDescription') || 'نوع الرسم البياني المفضل'}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="refreshInterval">{t('refreshInterval') || 'فترة التحديث (بالثواني)'}</Label>
          <Input 
            id="refreshInterval"
            type="number" 
            value={settings.refreshInterval}
            onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
            onBlur={() => updateSingle('refreshInterval', settings.refreshInterval)}
            className="border-border focus-visible:ring-primary"
          />
          <p className="text-xs text-muted-foreground">{t('refreshIntervalDescription') || 'الفترة الزمنية لتحديث البيانات تلقائيًا (بالثواني)'}</p>
        </div>
        
        <div className="space-y-4 border rounded-lg border-border p-4 bg-muted/20 mt-4">
          <h3 className="text-sm font-medium">{t('otherSettings') || 'إعدادات أخرى'}</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showTradingTips">{t('showTradingTips') || 'عرض نصائح التداول'}</Label>
              <p className="text-xs text-muted-foreground">{t('showTradingTipsDescription') || 'عرض نصائح وتلميحات للتداول'}</p>
            </div>
            <Switch 
              id="showTradingTips"
              checked={settings.showTradingTips} 
              onCheckedChange={(checked) => updateSingle('showTradingTips', checked)} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoRefreshData">{t('autoRefreshData') || 'تحديث البيانات تلقائيًا'}</Label>
              <p className="text-xs text-muted-foreground">{t('autoRefreshDataDescription') || 'تحديث البيانات تلقائيًا حسب فترة التحديث المحددة'}</p>
            </div>
            <Switch 
              id="autoRefreshData"
              checked={settings.autoRefreshData} 
              onCheckedChange={(checked) => updateSingle('autoRefreshData', checked)} 
            />
          </div>
        </div>
        
        <div className="pt-4 border-t border-border mt-6">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="relative overflow-hidden group"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
            {t('saveAllSettings') || 'حفظ جميع الإعدادات'}
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}