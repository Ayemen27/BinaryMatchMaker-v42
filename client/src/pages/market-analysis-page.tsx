import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, LineChart, ArrowDownUp, TrendingUp, CandlestickChart, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet';

export default function MarketAnalysisPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [asset, setAsset] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1d');
  const [chartType, setChartType] = useState('candlestick');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketAnalysis, setMarketAnalysis] = useState<{
    trend: "صعودي" | "هبوطي" | "متذبذب";
    strength: number;
    summary: string;
    keyLevels: { support: string[]; resistance: string[] };
  } | null>(null);
  
  // Function to analyze market trends using AI
  const analyzeMarketTrend = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/signal-generator/analyze-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pair: asset }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze market trend');
      }
      
      const analysis = await response.json();
      setMarketAnalysis(analysis);
      
      toast({
        title: t('analysisComplete'),
        description: t('marketAnalysisUpdated'),
      });
    } catch (error) {
      console.error('Error analyzing market trend:', error);
      toast({
        title: t('analysisError'),
        description: error instanceof Error ? error.message : t('tryAgainLater'),
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Analyze market on asset or timeframe change
  useEffect(() => {
    if (asset) {
      analyzeMarketTrend();
    }
  }, [asset]);
  
  return (
    <Layout>
      <Helmet>
        <title>Binarjoin Analytics | {t('marketAnalysis')}</title>
        <meta name="description" content="Technical analysis tools and market insights for binary options traders" />
      </Helmet>
      
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('marketAnalysis')}</h1>
          <p className="text-muted-foreground">{t('analyzeTrends')}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-3 space-y-6">
            {/* Chart Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Select value={asset} onValueChange={setAsset}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t('selectAsset')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                        <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                        <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                        <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                        <SelectItem value="DOGE/USDT">DOGE/USDT</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={timeframe} onValueChange={setTimeframe}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder={t('timeframe')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1m</SelectItem>
                        <SelectItem value="5m">5m</SelectItem>
                        <SelectItem value="15m">15m</SelectItem>
                        <SelectItem value="1h">1h</SelectItem>
                        <SelectItem value="4h">4h</SelectItem>
                        <SelectItem value="1d">1d</SelectItem>
                        <SelectItem value="1w">1w</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant={chartType === 'candlestick' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setChartType('candlestick')}
                    >
                      <CandlestickChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartType === 'line' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setChartType('line')}
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartType === 'bar' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setChartType('bar')}
                    >
                      <BarChart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Chart Card */}
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="border-b border-border p-4">
                <CardTitle className="flex items-center">
                  <ArrowDownUp className="mr-2 h-5 w-5" />
                  {asset} ({timeframe})
                </CardTitle>
              </CardHeader>
              
              {/* Chart Container */}
              <div className="chart-container p-4" style={{ height: '500px' }}>
                <div className="chart-gradient"></div>
                <svg viewBox="0 0 1000 300" className="chart-line">
                  <path d="M0,250 C50,220 100,260 150,200 C200,140 250,250 300,200 C350,150 400,190 450,120 C500,50 550,100 600,80 C650,60 700,90 750,40 C800,-10 850,50 900,90 C950,130 1000,150 1000,150" />
                </svg>
                <div className="chart-points">
                  <div className="buy-point" style={{ left: '30%', top: '60%' }}>
                    <div className="chart-tooltip" style={{ top: '-40px', left: '50%' }}>
                      {t('buyPoint')}: 37,540.00 USDT
                    </div>
                  </div>
                  <div className="sell-point" style={{ left: '75%', top: '30%' }}>
                    <div className="chart-tooltip" style={{ top: '-40px', left: '50%' }}>
                      {t('sellPoint')}: 38,750.00 USDT
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Technical Analysis */}
            <Card>
              <CardHeader className="border-b border-border p-4">
                <CardTitle>{t('technicalAnalysis')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{t('rsiIndicator')}</h3>
                      <span className="text-success">63.5</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="bg-success h-full" style={{ width: '63.5%' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{t('macdIndicator')}</h3>
                      <span className="text-destructive">-12.8</span>
                    </div>
                    <div className="h-10 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{t('bollingerBands')}</h3>
                      <span className="text-primary">Mid</span>
                    </div>
                    <div className="h-10 flex items-center justify-center">
                      <div className="relative w-full h-2">
                        <div className="absolute inset-0 bg-secondary rounded-full"></div>
                        <div className="absolute inset-y-0 left-1/4 right-1/4 bg-primary rounded-full"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-foreground"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Market Overview */}
            <Card>
              <CardHeader className="border-b border-border p-4">
                <CardTitle>{t('marketSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">{t('currentPrice')}</p>
                    <p className="text-2xl font-semibold">$37,540.00</p>
                    <p className="text-sm text-success">+2.4% (24h)</p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">{t('24hRange')}</p>
                    <div className="flex justify-between">
                      <span className="text-sm">$36,750.25</span>
                      <span className="text-sm">$38,120.50</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">{t('volume24h')}</p>
                    <p className="text-lg font-semibold">$28.5B</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Indicators */}
            <Card>
              <CardHeader className="border-b border-border p-4">
                <CardTitle>{t('indicators')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="oscillators">
                  <div className="border-b border-border">
                    <TabsList className="w-full justify-start border-b-0 rounded-none h-auto p-0">
                      <TabsTrigger 
                        value="oscillators" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-4"
                      >
                        {t('oscillators')}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="moving-averages" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-4"
                      >
                        {t('movingAverages')}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="oscillators" className="p-4 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">RSI (14)</span>
                      <span className="text-sm font-medium">63.5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MACD (12, 26, 9)</span>
                      <span className="text-sm font-medium text-destructive">-12.8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Stochastic (14, 3, 3)</span>
                      <span className="text-sm font-medium">77.5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">CCI (20)</span>
                      <span className="text-sm font-medium">105.3</span>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="moving-averages" className="p-4 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">MA (5)</span>
                      <span className="text-sm font-medium text-success">$37,625.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MA (10)</span>
                      <span className="text-sm font-medium text-success">$37,210.75</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MA (20)</span>
                      <span className="text-sm font-medium text-destructive">$37,840.25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MA (50)</span>
                      <span className="text-sm font-medium text-destructive">$38,350.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MA (200)</span>
                      <span className="text-sm font-medium text-destructive">$39,275.50</span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Market Analysis */}
            <Card>
              <CardHeader className="border-b border-border p-4 bg-card">
                <CardTitle className="flex justify-between items-center">
                  <span>{t('aiMarketAnalysis')}</span>
                  {isAnalyzing && <Loader className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {marketAnalysis ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full 
                        ${marketAnalysis.trend === "صعودي" ? "bg-success/20 text-success" : 
                          marketAnalysis.trend === "هبوطي" ? "bg-destructive/20 text-destructive" : 
                          "bg-amber-500/20 text-amber-500"}`}>
                        <ArrowDownUp className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">
                          {marketAnalysis.trend === "صعودي" ? t('bullishTrend') : 
                           marketAnalysis.trend === "هبوطي" ? t('bearishTrend') : 
                           t('sidewaysTrend')}
                        </h3>
                        <div className="flex items-center mt-1">
                          <div className="w-24 bg-muted rounded-full h-1.5 mr-2">
                            <div className={`h-1.5 rounded-full 
                              ${marketAnalysis.trend === "صعودي" ? "bg-success" : 
                                marketAnalysis.trend === "هبوطي" ? "bg-destructive" : 
                                "bg-amber-500"}`} 
                              style={{ width: `${marketAnalysis.strength}%` }}>
                            </div>
                          </div>
                          <span className="text-xs font-medium">{marketAnalysis.strength}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {marketAnalysis.summary}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted p-3 rounded">
                        <p className="text-xs font-semibold text-muted-foreground">{t('supportLevels')}</p>
                        <div className="space-y-1 mt-2">
                          {marketAnalysis.keyLevels.support.map((level, idx) => (
                            <p key={idx} className="font-medium">${level}</p>
                          ))}
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded">
                        <p className="text-xs font-semibold text-muted-foreground">{t('resistanceLevels')}</p>
                        <div className="space-y-1 mt-2">
                          {marketAnalysis.keyLevels.resistance.map((level, idx) => (
                            <p key={idx} className="font-medium">${level}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={analyzeMarketTrend}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader className="mr-2 h-3 w-3 animate-spin" />
                            {t('analyzing')}
                          </>
                        ) : (
                          t('refreshAnalysis')
                        )}
                      </Button>
                    </div>
                  </div>
                ) : isAnalyzing ? (
                  <div className="py-8 text-center">
                    <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p>{t('analyzingMarket')}</p>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Button onClick={analyzeMarketTrend}>
                      {t('analyzeMarket')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
