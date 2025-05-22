import { Button } from '@/components/ui/button';
import { Globe, Menu, User } from 'lucide-react';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramHeaderProps {
  telegramUser: TelegramUser | null;
  i18n: any;
  t: any;
}

export function TelegramHeader({ telegramUser, i18n, t }: TelegramHeaderProps) {
  return (
    <header className="telegram-app-header">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="mr-2">
            <User className="h-5 w-5 text-white" />
          </div>
          {telegramUser ? (
            <span className="text-white text-sm">
              {telegramUser.first_name || telegramUser.username || "مستخدم"}
            </span>
          ) : (
            <span className="text-white text-sm">مستخدم</span>
          )}
        </div>
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-white">BinarJoin Analytics</h1>
        </div>
        
        <div className="ml-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white p-0"
            onClick={() => {
              const newLang = i18n.language === 'ar' ? 'en' : 'ar';
              i18n.changeLanguage(newLang);
              localStorage.setItem('language', newLang);
              document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
            }}
          >
            <Globe className="h-5 w-5" />
            <span className="sr-only">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}