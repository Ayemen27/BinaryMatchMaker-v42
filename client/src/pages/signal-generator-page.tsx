import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart2, Award, Brain, Cpu, BrainCircuit } from 'lucide-react';
import { SignalCard } from '@/components/signals/signal-card';
import { Signal } from '@/types';
import { Helmet } from 'react-helmet';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';

export default function SignalGeneratorPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSignal, setGeneratedSignal] = useState<Signal | null>(null);
  
  // Form states
  const [platform, setPlatform] = useState<string>('');
  const [pair, setPair] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('');
  const [useAI, setUseAI] = useState<boolean>(true);
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'algorithmic'>('ai');
  
  // Fetch user settings to get AI preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/user/settings'],
    enabled: !!user,
  });
  
  // When user settings load, set the initial AI usage preference
  useEffect(() => {
    if (userSettings) {
      setUseAI(userSettings.useAiForSignals !== false);
    }
  }, [userSettings]);
  
  // Available platforms, pairs, and timeframes
  const platforms = ['Binance', 'IQ Option', 'Olymp Trade', 'Pocket Option', 'Deriv'];
  const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD', 'XRP/USD', 'BNB/USD', 'SOL/USD'];
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  
  const handleGenerateSignal = async () => {
    // Validate form
    if (!platform || !pair || !timeframe) {
      toast({
        title: t('formError'),
        description: t('selectAllFields'),
        variant: 'destructive',
      });
      return;
    }
    
    // Start loading
    setIsGenerating(true);
    
    // Update generation method for display in the UI
    setGenerationMethod(useAI ? 'ai' : 'algorithmic');
    
    try {
      // Make API call to generate a signal
      const response = await fetch('/api/signal-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          pair,
          timeframe,
          useAI  // Send the AI preference to the backend
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate signal');
      }
      
      // Parse the generated signal from API
      const newSignal: Signal = await response.json();
      
      setGeneratedSignal(newSignal);
      
      toast({
        title: t('signalGenerated'),
        description: t('signalGeneratedDesc'),
      });
    } catch (error) {
      console.error('Error generating signal:', error);
      toast({
        title: t('errorGeneratingSignal'),
        description: error instanceof Error ? error.message : t('tryAgainLater'),
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
      
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">{t('signalGenerator')}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Signal Generation Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('generateAiSignal')}</CardTitle>
              <CardDescription>{t('selectOptionsBelow')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Platform Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="platform">{t('platform')}</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
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
                    <Label htmlFor="pair">{t('assetPair')}</Label>
                    <Select value={pair} onValueChange={setPair}>
                      <SelectTrigger>
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
                    <Label htmlFor="timeframe">{t('timeframe')}</Label>
                    <Select value={timeframe} onValueChange={setTimeframe}>
                      <SelectTrigger>
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
                <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    {useAI ? (
                      <Brain className="h-5 w-5 text-primary" />
                    ) : (
                      <Cpu className="h-5 w-5 text-muted-foreground" />
                    )}
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
                  />
                </div>

                {/* Generate Button */}
                <Button 
                  className="w-full" 
                  onClick={handleGenerateSignal}
                  disabled={isGenerating || !platform || !pair || !timeframe}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      {useAI ? <BrainCircuit className="mr-2 h-4 w-4" /> : <Cpu className="mr-2 h-4 w-4" />}
                      {t('generateSignal')}
                    </>
                  )}
                </Button>
                
                {/* Subscription Notice for Free Users */}
                {user?.subscriptionLevel === 'free' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('freeAccountLimited')} <a href="/settings" className="text-primary hover:underline">{t('upgradePlan')}</a>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Signal Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>{t('aiSignalBenefits')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-primary/20 p-2 rounded-full mr-3">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('highAccuracy')}</p>
                    <p className="text-sm text-muted-foreground">{t('accuracyDesc')}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-primary/20 p-2 rounded-full mr-3">
                    <BarChart2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('advancedAlgorithms')}</p>
                    <p className="text-sm text-muted-foreground">{t('algorithmsDesc')}</p>
                  </div>
                </div>
                
                {/* Add more benefits here */}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Generated Signal */}
        {generatedSignal && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">
              {t('generatedSignal')}
              <div className="flex items-center gap-2 mt-2">
                <div className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                  generationMethod === 'ai' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
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
                  <div className="text-sm text-muted-foreground">
                    {t('aiAccuracy') || 'دقة تقديرية: 90%+'}
                  </div>
                )}
              </div>
            </h2>
            <div className="max-w-md">
              <SignalCard signal={generatedSignal} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}