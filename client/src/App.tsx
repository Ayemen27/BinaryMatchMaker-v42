import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import SignalsPage from "@/pages/signals-page";
import MarketAnalysisPage from "@/pages/market-analysis-page";
import SignalHistoryPage from "@/pages/signal-history-page";
import SignalGeneratorPage from "@/pages/signal-generator-page";
import SettingsPage from "@/pages/settings-page"; // استخدام صفحة الإعدادات 
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "next-themes";
import { ThemeSync } from "./hooks/use-theme-sync";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/signals" component={SignalsPage} />
      <ProtectedRoute path="/signal-generator" component={SignalGeneratorPage} />
      <ProtectedRoute path="/market-analysis" component={MarketAnalysisPage} />
      <ProtectedRoute path="/signal-history" component={SignalHistoryPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <TooltipProvider>
            <ThemeSync />
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
