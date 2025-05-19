import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, LineChart, Activity, History, 
  Settings, Crown, ChevronRight, Cpu, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const navigation = [
    { 
      name: t('dashboard'), 
      href: '/', 
      icon: LayoutDashboard, 
      current: location === '/' 
    },
    { 
      name: t('signals'), 
      href: '/signals', 
      icon: Activity, 
      current: location === '/signals',
      badge: 3 
    },
    { 
      name: t('signalGenerator'), 
      href: '/signal-generator', 
      icon: Cpu, 
      current: location === '/signal-generator'
    },
    { 
      name: t('marketAnalysis'), 
      href: '/market-analysis', 
      icon: LineChart, 
      current: location === '/market-analysis' 
    },
    { 
      name: t('signalHistoryMenu'), 
      href: '/signal-history', 
      icon: History, 
      current: location === '/signal-history' 
    },
    { 
      name: t('settings'), 
      href: '/settings', 
      icon: Settings, 
      current: location === '/settings' 
    },
  ];

  const classNames = cn(
    "fixed inset-y-0 z-40 flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 md:translate-x-0 md:static md:flex",
    isOpen ? "flex translate-x-0" : "hidden -translate-x-full rtl:translate-x-full"
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={classNames}>
        <div className="p-4 flex items-center border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
            <LineChart size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Binarjoin</h1>
            <p className="text-xs text-muted-foreground">{t('analyticsTitle')}</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {navigation.map((item) => (
              <li key={item.name} className="mb-1 px-2">
                <Link href={item.href}>
                  <a 
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition",
                      item.current 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    onClick={() => onClose()}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className={cn("mx-3", !item.current && "text-muted-foreground")}>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-success px-1.5 py-0.5 rounded-full text-xs text-success-foreground">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-accent rounded-lg p-3">
            <div className="flex items-center mb-3">
              <div className="bg-warning/20 text-warning rounded-full p-2 ml-3">
                <Crown size={16} />
              </div>
              <div>
                <h3 className="font-medium">{t('freeSubscription')}</h3>
                <p className="text-xs text-muted-foreground">{t('remainingSignals', { count: 3 })}</p>
              </div>
            </div>
            <Button className="w-full" size="sm">
              {t('upgradePlan')}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
