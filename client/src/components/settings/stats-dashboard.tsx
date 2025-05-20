/**
 * لوحة إحصائيات المستخدم
 * تعرض بيانات استخدام النظام والإشارات المولدة وغيرها من المعلومات المفيدة
 */
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, PieChart, Activity, LineChart, Zap, BarChart3 } from "lucide-react";

interface StatsProps {
  userData?: any;
  signalStats?: any;
  className?: string;
}

export function StatsDashboard({ userData, signalStats, className }: StatsProps) {
  const { t } = useTranslation();
  
  // بيانات إحصائية افتراضية للعرض (سيتم استبدالها ببيانات حقيقية من الخادم)
  const mockStats = {
    totalSignals: 128,
    successRate: 76,
    avgDailySignals: 4.2,
    preferredPair: "BTC/USDT",
    activeDays: 30,
    lastActivity: new Date(),
    usage: {
      api: 45,
      signals: 65,
      charts: 80,
    }
  };
  
  // استخدام البيانات الفعلية إذا كانت متوفرة، وإلا استخدام البيانات الافتراضية
  const stats = signalStats || mockStats;
  
  return (
    <Card className={`border border-border shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">{t("usageStats")}</CardTitle>
          <Badge variant="outline" className="font-normal">
            {t("last30Days")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{t("totalSignals")}</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSignals}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{t("successRate")}</span>
            </div>
            <p className="text-2xl font-bold">{stats.successRate}%</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{t("dailyAvg")}</span>
            </div>
            <p className="text-2xl font-bold">{stats.avgDailySignals}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">{t("favPair")}</span>
            </div>
            <p className="text-2xl font-bold">{stats.preferredPair}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium text-sm mb-2">{t("resourceUsage")}</h4>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t("apiCalls")}</span>
              <span>{stats.usage.api}%</span>
            </div>
            <Progress value={stats.usage.api} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t("signalGeneration")}</span>
              <span>{stats.usage.signals}%</span>
            </div>
            <Progress value={stats.usage.signals} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t("chartViews")}</span>
              <span>{stats.usage.charts}%</span>
            </div>
            <Progress value={stats.usage.charts} className="h-2" />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <p className="flex justify-between">
            <span>{t("lastActive")}</span>
            <span className="font-medium">{new Date(stats.lastActivity).toLocaleDateString()}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}