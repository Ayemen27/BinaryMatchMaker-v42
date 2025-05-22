/**
 * علامة تبويب الإعدادات البسيطة
 * هذا المكون يغلف نموذج الإعدادات ويستخدم النظام الجديد
 */
import { useTranslation } from "react-i18next";
import { SettingsForm } from "./settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings2 } from "lucide-react";

export function SimpleSettingsTab() {
  const { t } = useTranslation();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>{t("generalSettings")}</CardTitle>
        </div>
        <CardDescription>
          {t("generalSettingsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm />
      </CardContent>
    </Card>
  );
}