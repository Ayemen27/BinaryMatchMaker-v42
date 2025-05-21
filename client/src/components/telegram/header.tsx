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
    <header className="telegram-app-header bg-gradient-to-r from-yellow-500/80 to-amber-500/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50 shadow-md">
      <div className="container mx-auto flex justify-between items-center py-2.5 px-4">
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-white">BinarJoin Analytics</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 transition-all"
            onClick={() => {
              const newLang = i18n.language === 'ar' ? 'en' : 'ar';
              i18n.changeLanguage(newLang);
              localStorage.setItem('language', newLang);
              document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
            }}
          >
            <Globe className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
          </Button>
          
          <div className="flex items-center border-l border-white/30 pl-3">
            {telegramUser ? (
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center mr-2 border border-white/20">
                  {telegramUser.first_name ? telegramUser.first_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">
                    {telegramUser.first_name || t('user')}
                  </span>
                  {telegramUser.username && (
                    <span className="text-xs text-white/80 block">@{telegramUser.username}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center text-white">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center mr-2">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{t('user')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}