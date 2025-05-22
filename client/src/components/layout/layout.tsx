import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className={cn("flex min-h-screen overflow-hidden", isRtl ? 'rtl' : 'ltr')}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col bg-background overflow-hidden">
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex-1 overflow-y-auto pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
