/**
 * مكون معلومات الحساب
 * يعرض معلومات المستخدم مثل نوع الاشتراك والوقت المتبقي
 */
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { UserProfile } from "@/types/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, Star, Medal, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface AccountInfoCardProps {
  userData?: UserProfile | null;
  className?: string;
}

export function AccountInfoCard({ userData, className }: AccountInfoCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  // استخدام بيانات المستخدم من المدخلات أو من سياق المصادقة
  const currentUser = userData || user;
  
  if (!currentUser) {
    return null;
  }
  
  // تنسيق مستوى الاشتراك
  const formatSubscriptionLevel = (level?: string) => {
    switch(level) {
      case "vip":
        return { 
          label: "VIP", 
          color: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0",
          icon: <Medal className="h-4 w-4 mr-1" /> 
        };
      case "pro":
        return { 
          label: t("proSubscription"), 
          color: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0",
          icon: <Star className="h-4 w-4 mr-1" /> 
        };
      case "basic":
        return { 
          label: t("basicSubscription"), 
          color: "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0",
          icon: <Star className="h-4 w-4 mr-1" /> 
        };
      default:
        return { 
          label: t("freeSubscription"), 
          color: "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0",
          icon: null 
        };
    }
  };
  
  const subscription = formatSubscriptionLevel(currentUser.subscriptionLevel);
  
  // الحصول على تاريخ انتهاء الاشتراك (افتراضي للعرض)
  const expiryDate = currentUser.subscriptionExpiry ? 
    new Date(currentUser.subscriptionExpiry) : 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // افتراضي: 30 يوم
    
  // حساب الوقت المتبقي بتنسيق محلي
  const timeRemaining = formatDistanceToNow(expiryDate, { 
    addSuffix: true,
    locale: i18n.language === 'ar' ? ar : enUS
  });
  
  return (
    <Card className={`border border-border shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">{t("accountInfo")}</CardTitle>
          <Badge className={subscription.color}>
            <div className="flex items-center">
              {subscription.icon}
              {subscription.label}
            </div>
          </Badge>
        </div>
        <CardDescription>{t("accountInfoDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{currentUser.username}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span className="text-muted-foreground">{currentUser.email}</span>
          </div>
          
          {currentUser.subscriptionLevel && currentUser.subscriptionLevel !== 'free' && (
            <div className="rounded-md bg-muted p-3 flex items-start justify-between">
              <div>
                <h4 className="font-medium mb-1">{t("subscriptionStatus")}</h4>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("expiresIn")}: {timeRemaining}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">
                  {currentUser.subscriptionLevel === 'pro' ? '✓ ' + t("premiumAccess") : t("basicAccess")}
                </Badge>
                <Badge variant="outline" className="bg-green-50">
                  {t("active")}
                </Badge>
              </div>
            </div>
          )}
          
          {(!currentUser.subscriptionLevel || currentUser.subscriptionLevel === 'free') && (
            <div className="rounded-md bg-primary/5 p-3 flex items-start justify-between border border-primary/10">
              <div>
                <h4 className="font-medium mb-1">{t("upgradeAccount")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("upgradeDescription")}
                </p>
              </div>
              <button className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
                {t("upgrade")}
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}