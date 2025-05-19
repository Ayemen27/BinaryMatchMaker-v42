import { useState } from 'react';
import { Menu, Search, Bell, Globe, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

interface HeaderProps {
  onSidebarToggle: () => void;
}

export function Header({ onSidebarToggle }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { user, logoutMutation } = useAuth();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-card border-b border-border">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={onSidebarToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('toggleSidebar')}</span>
          </Button>
          
          <div className="relative ml-4 w-64 hidden md:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('search')}
              className="pl-8 bg-secondary border-secondary"
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="relative mr-2 text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
            <span className="sr-only">{t('notifications')}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-muted-foreground hover:text-foreground"
            onClick={toggleLanguage}
          >
            <Globe className="h-5 w-5" />
            <span className="sr-only">{t('toggleLanguage')}</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=36&h=36&q=80" />
                  <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block">{user?.username}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                {t('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
