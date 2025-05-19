import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, BarChart2, Award, Brain, Cpu, BrainCircuit, 
  Clock, TrendingUp, LineChart, ArrowUpCircle, ArrowDownCircle, 
  Target, Shield, Lightbulb, Sparkles, Zap
} from 'lucide-react';
import { SignalCard } from '@/components/signals/signal-card';
import { Signal } from '@/types';
import { Helmet } from 'react-helmet';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

export default function SignalGeneratorPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSignal, setGeneratedSignal] = useState<Signal | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Form states
  const [platform, setPlatform] = useState<string>('');
  const [pair, setPair] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('');
  const [useAI, setUseAI] = useState<boolean>(true);
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'algorithmic'>('ai');
  const [activeTab, setActiveTab] = useState<string>('standard');
  const [isOtcEnabled, setIsOtcEnabled] = useState<boolean>(false); // خيار التداول خارج السوق
  const [currentPrice, setCurrentPrice] = useState<string | null>(null); // السعر الحالي للزوج
  const [lastSignalTime, setLastSignalTime] = useState<Date | null>(null); // وقت آخر إشارة تم توليدها
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true); // حالة السوق (مفتوح أو مغلق)
  const [scheduledSignal, setScheduledSignal] = useState<boolean>(false); // طلب إشارة عندما يفتح السوق
  
  // Fetch user settings to get AI preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/user/settings'],
    enabled: !!user,
  });
  
  // When user settings load, set the initial AI usage preference
  useEffect(() => {
    if (userSettings) {
      // تحقق من وجود الإعداد وتفعيله أو تعطيله
      const useAiSetting = userSettings.useAiForSignals as boolean | undefined;
      setUseAI(useAiSetting !== false);
    }
  }, [userSettings]);
  
  // Progress bar animation during generation
  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      setGenerationProgress(0);
      interval = window.setInterval(() => {
        setGenerationProgress((prev) => {
          // Simulate progress but never reach 100% until completed
          if (prev < 95) {
            return prev + (95 - prev) / 10;
          }
          return prev;
        });
      }, 200);
    } else if (generationProgress > 0) {
      // When generation is complete, reach 100%
      setGenerationProgress(100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);
  
  // Available platforms, pairs, and timeframes
  const platforms = ['Binance', 'IQ Option', 'Olymp Trade', 'Pocket Option', 'Deriv'];
  const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD', 'XRP/USD', 'BNB/USD', 'SOL/USD'];
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  
  // التحقق من إمكانية توليد إشارة بناءً على الإطار الزمني منذ آخر إشارة
  const canGenerateSignal = () => {
    if (!lastSignalTime || !timeframe) return true;
    
    const now = new Date();
    const timeSinceLastSignal = now.getTime() - lastSignalTime.getTime();
    
    // تحويل الإطار الزمني إلى دقائق
    let timeframeInMinutes = 0;
    
    switch (timeframe) {
      case '1m':
        timeframeInMinutes = 1;
        break;
      case '5m':
        timeframeInMinutes = 5;
        break;
      case '15m':
        timeframeInMinutes = 15;
        break;
      case '30m':
        timeframeInMinutes = 30;
        break;
      case '1h':
        timeframeInMinutes = 60;
        break;
      case '4h':
        timeframeInMinutes = 240;
        break;
      case '1d':
        timeframeInMinutes = 1440;
        break;
      default:
        timeframeInMinutes = 0;
    }
    
    // يمكن توليد إشارة جديدة فقط بعد انتهاء الإطار الزمني للإشارة الحالية
    return timeSinceLastSignal >= timeframeInMinutes * 60 * 1000;
  };

  const handleGenerateSignal = async () => {
    // التحقق من صحة النموذج
    if (!platform || !pair || !timeframe) {
      toast({
        title: t('formError') || 'خطأ في النموذج',
        description: t('selectAllFields') || 'يرجى تحديد جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }
    
    // التحقق من حالة السوق
    if (!isMarketOpen && !isOtcEnabled) {
      // إذا كان السوق مغلق ولم يتم تفعيل خيار OTC
      toast({
        title: t('marketClosed') || 'السوق مغلق',
        description: t('marketClosedDesc') || 'السوق مغلق حالياً. يمكنك تفعيل خيار التداول خارج السوق (OTC) أو جدولة إشارة عند فتح السوق.',
        variant: 'destructive',
      });
      return;
    }
    
    // التحقق من إمكانية توليد إشارة بناءً على الوقت المنقضي منذ آخر إشارة
    if (!canGenerateSignal()) {
      const timeframeText = timeframe === '1d' ? 'يوم' : 
                          timeframe === '4h' ? '4 ساعات' : 
                          timeframe === '1h' ? 'ساعة' : 
                          timeframe === '30m' ? '30 دقيقة' : 
                          timeframe === '15m' ? '15 دقيقة' : 
                          timeframe === '5m' ? '5 دقائق' : 'دقيقة';
                          
      toast({
        title: t('cannotGenerateYet') || 'لا يمكن توليد إشارة جديدة الآن',
        description: t('waitTimeframeCompletion', { timeframe: timeframeText }) || 
                   `يجب الانتظار حتى اكتمال الإطار الزمني الحالي (${timeframeText}) قبل توليد إشارة جديدة.`,
        variant: 'destructive',
      });
      return;
    }
    
    // بدء التحميل
    setIsGenerating(true);
    
    // تحديث طريقة التوليد للعرض في واجهة المستخدم
    setGenerationMethod(useAI ? 'ai' : 'algorithmic');
    
    try {
      // إذا كان السوق مغلق وتم تفعيل جدولة الإشارات
      if (!isMarketOpen && scheduledSignal) {
        // تخزين طلب الإشارة للتنفيذ عند فتح السوق
        localStorage.setItem('scheduledSignal', JSON.stringify({
          platform,
          pair,
          timeframe,
          useAI,
          timestamp: new Date().toISOString()
        }));
        
        toast({
          title: t('signalScheduled') || 'تم جدولة الإشارة',
          description: t('signalScheduledDesc') || 'سيتم توليد الإشارة تلقائياً عند فتح السوق.',
        });
        
        setIsGenerating(false);
        return;
      }
      
      // استدعاء API لتوليد إشارة
      const response = await fetch('/api/signal-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          pair,
          timeframe,
          useAI,  // إرسال تفضيل الذكاء الاصطناعي إلى الخادم
          isOtcEnabled, // إرسال حالة تفعيل OTC
          currentPrice // إرسال السعر الحالي إذا كان متاحاً
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في توليد الإشارة');
      }
      
      // تحليل الإشارة المولدة من API
      const newSignal: Signal = await response.json();
      
      // تحديث الإشارة المولدة وحفظ وقت التوليد
      setGeneratedSignal(newSignal);
      setLastSignalTime(new Date());
      
      toast({
        title: t('signalGenerated') || 'تم توليد الإشارة',
        description: t('signalGeneratedDesc') || 'تم توليد إشارة جديدة بنجاح.',
      });
    } catch (error) {
      console.error('خطأ في توليد الإشارة:', error);
      toast({
        title: t('errorGeneratingSignal') || 'خطأ في توليد الإشارة',
        description: error instanceof Error ? error.message : t('tryAgainLater') || 'يرجى المحاولة مرة أخرى لاحقاً',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('signalGenerator')}</title>
        <meta name="description" content={t('signalGeneratorDesc')} />
      </Helmet>
      
      <div className="relative">
        {/* Hero Section with Gradient Background */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background py-12 px-4 relative overflow-hidden">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                {t('signalGenerator')}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('signalGeneratorHeroDesc') || 'أداة متقدمة لتوليد إشارات تداول الخيارات الثنائية بدقة عالية باستخدام الذكاء الاصطناعي والخوارزميات المتطورة'}
              </p>
            </motion.div>
          </div>
        </div>
        
        <div className="container py-8">
          <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
              <TabsTrigger value="standard" className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                {t('standardGeneration') || 'التوليد القياسي'}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('advancedOptions') || 'خيارات متقدمة'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="standard" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Signal Generation Form */}
                <Card className="md:col-span-2 shadow-lg border-t-4 border-t-primary">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {t('generateAiSignal')}
                    </CardTitle>
                    <CardDescription>{t('selectOptionsBelow')}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Platform Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="platform" className="flex items-center gap-1">
                            <Shield className="h-4 w-4 text-primary" />
                            {t('platform')}
                          </Label>
                          <Select value={platform} onValueChange={setPlatform}>
                            <SelectTrigger className="bg-muted/40">
                              <SelectValue placeholder={t('selectPlatform')} />
                            </SelectTrigger>
                            <SelectContent>
                              {platforms.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Asset Pair Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="pair" className="flex items-center gap-1">
                            <LineChart className="h-4 w-4 text-primary" />
                            {t('assetPair')}
                          </Label>
                          <Select value={pair} onValueChange={setPair}>
                            <SelectTrigger className="bg-muted/40">
                              <SelectValue placeholder={t('selectPair')} />
                            </SelectTrigger>
                            <SelectContent>
                              {pairs.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Timeframe Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="timeframe" className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-primary" />
                            {t('timeframe')}
                          </Label>
                          <Select value={timeframe} onValueChange={setTimeframe}>
                            <SelectTrigger className="bg-muted/40">
                              <SelectValue placeholder={t('selectTimeframe')} />
                            </SelectTrigger>
                            <SelectContent>
                              {timeframes.map((tf) => (
                                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* AI Toggle Switch */}
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg mb-4 border border-primary/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${useAI ? 'bg-primary/20' : 'bg-muted/80'}`}>
                            {useAI ? (
                              <Brain className="h-5 w-5 text-primary" />
                            ) : (
                              <Cpu className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {useAI ? 
                                (t('aiGenerationEnabled') || 'توليد الإشارات بالذكاء الاصطناعي مفعّل') : 
                                (t('algorithmicGeneration') || 'توليد الإشارات بالخوارزميات التقليدية')
                              }
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {useAI ? 
                                (t('aiGenerationDesc') || 'يتم استخدام تقنيات الذكاء الاصطناعي المتقدمة لتوليد إشارات بدقة عالية') : 
                                (t('algorithmicGenerationDesc') || 'يتم استخدام خوارزميات تقليدية لتوليد الإشارات')
                              }
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={useAI}
                          onCheckedChange={setUseAI}
                          aria-label={t('toggleAiGeneration') || 'تبديل استخدام الذكاء الاصطناعي'}
                          className="data-[state=checked]:bg-primary"
                        />
                      </motion.div>
                      
                      {/* OTC Trading Toggle */}
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/5 to-blue-500/10 rounded-lg mb-4 border border-blue-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isOtcEnabled ? 'bg-blue-500/20' : 'bg-muted/80'}`}>
                            {isOtcEnabled ? (
                              <Clock className="h-5 w-5 text-blue-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {isOtcEnabled ? 
                                (t('otcTradingEnabled') || 'تداول خارج السوق مفعّل') : 
                                (t('otcTradingDisabled') || 'تداول خارج السوق معطّل')
                              }
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {isOtcEnabled ? 
                                (t('otcTradingEnabledDesc') || 'يمكنك توليد إشارات خارج أوقات التداول الرسمية') : 
                                (t('otcTradingDisabledDesc') || 'سيتم توليد إشارات فقط خلال أوقات التداول الرسمية')
                              }
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isOtcEnabled}
                          onCheckedChange={setIsOtcEnabled}
                          aria-label={t('toggleOtcTrading') || 'تبديل التداول خارج السوق'}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </motion.div>
                      
                      {/* Market Status Indicator */}
                      {!isMarketOpen && (
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            <h3 className="font-medium text-orange-500">
                              {t('marketClosed') || 'السوق مغلق حالياً'}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('marketClosedDesc') || 'الأسواق المالية مغلقة حالياً. يمكنك تفعيل خيار التداول خارج السوق (OTC) أو جدولة إشارة عند فتح السوق.'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <Switch
                              checked={scheduledSignal}
                              onCheckedChange={setScheduledSignal}
                              aria-label={t('toggleScheduledSignal') || 'تبديل جدولة الإشارات'}
                              className="data-[state=checked]:bg-orange-500"
                            />
                            <Label htmlFor="scheduledSignal" className="text-sm cursor-pointer">
                              {t('scheduleSignalWhenMarketOpens') || 'جدولة توليد الإشارة عند فتح السوق'}
                            </Label>
                          </div>
                        </div>
                      )}
                      
                      {/* Current Price Indicator */}
                      {currentPrice && pair && (
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart2 className="h-5 w-5 text-primary" />
                              <h3 className="font-medium">
                                {t('currentPrice') || 'السعر الحالي'}: {pair}
                              </h3>
                            </div>
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                              {currentPrice}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Generate Button */}
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button 
                          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-lg font-medium"
                          onClick={handleGenerateSignal}
                          disabled={isGenerating || !platform || !pair || !timeframe}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              {t('generating')}
                            </>
                          ) : (
                            <>
                              {useAI ? <Zap className="mr-2 h-5 w-5" /> : <Target className="mr-2 h-5 w-5" />}
                              {t('generateSignal')}
                            </>
                          )}
                        </Button>
                      </motion.div>
                      
                      {/* Generation Progress */}
                      {isGenerating && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {useAI ? t('analyzingMarketData') || 'تحليل بيانات السوق...' : t('processingData') || 'معالجة البيانات...'}
                            </span>
                            <span className="font-medium">{Math.round(generationProgress)}%</span>
                          </div>
                          <Progress value={generationProgress} className="h-2" />
                        </div>
                      )}
                      
                      {/* Subscription Notice for Free Users */}
                      {user?.subscriptionLevel === 'free' && (
                        <div className="bg-muted p-3 rounded-lg mt-4 border-l-4 border-primary">
                          <p className="text-sm">
                            {t('freeAccountLimited')} <a href="/settings" className="text-primary hover:underline font-medium">{t('upgradePlan')}</a>
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 pb-4 text-xs text-muted-foreground">
                    {useAI ? 
                      (t('aiSignalFooterNote') || 'تستخدم هذه الأداة نماذج GPT-4o المتقدمة لتوليد إشارات تداول دقيقة ومدروسة') :
                      (t('algoSignalFooterNote') || 'تستخدم الخوارزميات التقليدية مؤشرات فنية متعددة لتوليد إشارات تداول موثوقة')
                    }
                  </CardFooter>
                </Card>
                
                {/* Signal Benefits & Features */}
                <Card className="shadow-lg bg-gradient-to-b from-background to-muted/30 border-t-4 border-t-primary/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      {t('aiSignalBenefits')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <motion.div 
                        className="flex items-start gap-3" 
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="bg-primary/20 p-2 rounded-full shrink-0 mt-1">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{t('highAccuracy') || 'دقة عالية'}</p>
                          <p className="text-sm text-muted-foreground">{t('accuracyDesc') || 'إشارات تداول بدقة تتجاوز 85% بفضل تحليل عميق للبيانات'}</p>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="flex items-start gap-3"
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="bg-primary/20 p-2 rounded-full shrink-0 mt-1">
                          <Lightbulb className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{t('advancedAlgorithms') || 'خوارزميات متقدمة'}</p>
                          <p className="text-sm text-muted-foreground">{t('algorithmsDesc') || 'تحليل متعدد المستويات يدمج عشرات المؤشرات الفنية'}</p>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="flex items-start gap-3"
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <div className="bg-primary/20 p-2 rounded-full shrink-0 mt-1">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{t('realTimeAnalysis') || 'تحليل فوري'}</p>
                          <p className="text-sm text-muted-foreground">{t('realTimeDesc') || 'تحليل لحظي لبيانات السوق لضمان دقة الإشارات المولدة'}</p>
                        </div>
                      </motion.div>
                      
                      <Separator className="my-3" />
                      
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <ArrowUpCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{t('buySignals') || 'إشارات الشراء'}</p>
                        </div>
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <ArrowDownCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                          <p className="text-sm font-medium">{t('sellSignals') || 'إشارات البيع'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced">
              <Card className="shadow-lg border-t-4 border-t-primary/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('advancedOptions') || 'خيارات متقدمة'}
                  </CardTitle>
                  <CardDescription>
                    {t('advancedOptionsDesc') || 'خيارات متقدمة متاحة للمستخدمين المميزين. قم بترقية حسابك للوصول إلى هذه الميزات.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 bg-muted/50 rounded-lg text-center">
                    <Sparkles className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-2">{t('premiumFeature') || 'ميزة مميزة'}</h3>
                    <p className="text-muted-foreground mb-4">{t('upgradeToAccess') || 'قم بترقية حسابك للوصول إلى خيارات التوليد المتقدمة وتخصيص المؤشرات وإعدادات متقدمة أخرى'}</p>
                    <Button variant="outline" className="bg-primary/10">
                      {t('upgradePlan') || 'ترقية الخطة'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Generated Signal */}
          {generatedSignal && (
            <motion.div 
              className="mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="border-l-4 border-primary pr-4 mb-6">
                <h2 className="text-2xl font-bold">
                  {t('generatedSignal') || 'الإشارة المُولّدة'}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                    generationMethod === 'ai' ? 'bg-primary/20 text-primary font-medium' : 'bg-muted text-muted-foreground'
                  }`}>
                    {generationMethod === 'ai' ? (
                      <>
                        <Brain className="h-4 w-4" />
                        {t('aiGenerated') || 'تم التوليد بالذكاء الاصطناعي'}
                      </>
                    ) : (
                      <>
                        <Cpu className="h-4 w-4" />
                        {t('algorithmicGenerated') || 'تم التوليد بالخوارزميات التقليدية'}
                      </>
                    )}
                  </div>
                  {generationMethod === 'ai' && (
                    <div className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-full font-medium">
                      {t('aiAccuracy') || 'دقة تقديرية: 90%+'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="max-w-md">
                  <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                    <SignalCard signal={generatedSignal} />
                  </motion.div>
                </div>
                
                <Card className="shadow-md bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-primary" />
                      {t('signalAnalysis') || 'تحليل الإشارة'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">{t('entryPrice') || 'سعر الدخول'}</h4>
                        <p className="font-semibold text-lg">{generatedSignal.entryPrice}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">{t('targetPrice') || 'السعر المستهدف'}</h4>
                        <p className="font-semibold text-lg text-green-500">{generatedSignal.targetPrice}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">{t('stopLoss') || 'وقف الخسارة'}</h4>
                        <p className="font-semibold text-lg text-red-500">{generatedSignal.stopLoss}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">{t('indicators') || 'المؤشرات'}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {generatedSignal.indicators?.map((indicator, index) => (
                            <div key={index} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                              {indicator}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {(generatedSignal.reason || (generatedSignal.analysis && generatedSignal.analysis.reasoning)) && (
                        <div>
                          <h4 className="text-sm text-muted-foreground mb-1">{t('signalReason') || 'سبب الإشارة'}</h4>
                          <p className="text-sm">{generatedSignal.reason || (generatedSignal.analysis && generatedSignal.analysis.reasoning)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      {t('saveSignal') || 'حفظ الإشارة'}
                    </Button>
                    <Button variant="outline" size="sm">
                      {t('shareSignal') || 'مشاركة'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}