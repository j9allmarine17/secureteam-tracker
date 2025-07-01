import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { BackgroundWrapper } from "@/components/background-wrapper";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Findings from "@/pages/findings";
import Team from "@/pages/team";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Chat from "@/pages/chat";
import Visualizations from "@/pages/visualizations";
import ActiveDirectoryTest from "@/pages/ad-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/findings" component={Findings} />
      <ProtectedRoute path="/team" component={Team} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/visualizations" component={Visualizations} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/ad-test" component={ActiveDirectoryTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BackgroundWrapper>
            <div className="dark">
              <Toaster />
              <Router />
            </div>
          </BackgroundWrapper>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
