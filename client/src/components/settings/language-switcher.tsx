/**
 * مبدل اللغة
 * يمكّن المستخدم من تغيير لغة التطبيق
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSwitcherProps {
  className?: string;
  onLanguageChange?: (lng: string) => void;
}

export function LanguageSwitcher({ className, onLanguageChange }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  
  // المتاح حالياً هو العربية والإنجليزية
  const supportedLanguages = [
    { code: "ar", name: "العربية" },
    { code: "en", name: "English" }
  ];
  
  // تغيير اللغة واستدعاء الدالة إذا وجدت
  const handleLanguageChange = (lng: string) => {
    // تطبيق اللغة
    i18n.changeLanguage(lng).then(() => {
      console.log(`تم تغيير اللغة إلى: ${lng}`);
      
      // إعادة تحميل الصفحة لتفعيل الترجمة بشكل كامل (حل مؤقت)
      // window.location.reload();
    });
    
    // حفظ اللغة المختارة في التخزين المحلي
    localStorage.setItem("language", lng);
    
    // تغيير اتجاه الصفحة حسب اللغة
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
    
    // استدعاء دالة التغيير من الخارج إذا وجدت
    if (onLanguageChange) {
      onLanguageChange(lng);
    }
  };
  
  return (
    <Card className={`border border-border shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Languages className="h-5 w-5 text-primary" />
          {t("languageSettings")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              {t("chooseLanguage")}
            </p>
            
            <Select
              value={i18n.language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectLanguage")} />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            {supportedLanguages.map((lang) => (
              <Button
                key={lang.code}
                variant={i18n.language === lang.code ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange(lang.code)}
                className="w-full flex items-center justify-center"
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}