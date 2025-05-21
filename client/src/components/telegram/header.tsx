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
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Menu className="h-5 w-5 mr-2 md:hidden" />
          <h1 className="text-lg font-bold">BinarJoin Analytics</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-primary-800"
            onClick={() => {
              const newLang = i18n.language === 'ar' ? 'en' : 'ar';
              i18n.changeLanguage(newLang);
              localStorage.setItem('language', newLang);
              document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
            }}
          >
            <Globe className="h-4 w-4 mr-1" />
            <span className="text-sm">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
          </Button>
          
          <div className="flex items-center border-l border-white/20 pl-3">
            {telegramUser ? (
              <div className="flex items-center">
                <div className="telegram-user-avatar">
                  {telegramUser.first_name ? telegramUser.first_name.charAt(0) : 'U'}
                </div>
                <span className="text-sm hidden md:inline-block">{telegramUser.first_name || t('guest')}</span>
              </div>
            ) : (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span className="text-sm">{t('guest')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}