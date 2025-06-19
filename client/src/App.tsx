import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import TestChat from "@/pages/test-chat";
import SubscriptionPlans from "@/pages/subscription-plans";
import AdminDashboard from "@/pages/admin-dashboard";
import { AppLayout } from "@/components/layout/app-layout";
import { ChatProvider } from "@/hooks/use-chat";
import { AuthProvider } from "@/hooks/use-auth-context";
import { AuthDialogProvider } from "@/components/auth/auth-provider";
import { WebSocketProvider } from "@/components/websocket/websocket-provider";
import { WebSocketConnectionManager } from "@/components/websocket/connection-manager";
import { useAuth } from "@/hooks/use-auth-context";
import { useLocation } from "wouter";

function Router() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Wrap authenticated routes with AppLayout
  const renderRoute = (Component: React.ComponentType) => {
    if (isAuthenticated && (location.startsWith('/app') || location.startsWith('/subscription-plans') || location.startsWith('/admin'))) {
      return (
        <AppLayout>
          <Component />
        </AppLayout>
      );
    }
    return <Component />;
  };

  return (
    <Switch>
      <Route path="/" component={() => renderRoute(LandingPage)} />
      <Route path="/auth" component={() => renderRoute(AuthPage)} />
      <Route path="/app" component={() => renderRoute(Home)} />
      <Route path="/test-chat" component={() => renderRoute(TestChat)} />
      <Route path="/subscription-plans" component={() => renderRoute(SubscriptionPlans)} />
      <Route path="/admin" component={() => renderRoute(AdminDashboard)} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthDialogProvider>
          <WebSocketProvider>
            <ChatProvider>
              <WebSocketConnectionManager />
              <Router />
            </ChatProvider>
          </WebSocketProvider>
        </AuthDialogProvider>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
