import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SchoolSelector } from "@/components/school-selector";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import TodayStatusPage from "@/pages/today-status";
import StudentsPage from "@/pages/students";
import StudentsImportPage from "@/pages/students-import";
import GradeLevelsPage from "@/pages/grade-levels";
import SectionsPage from "@/pages/sections";
import KiosksPage from "@/pages/kiosks";
import GateKiosksPage from "@/pages/gate-kiosks";
import SettingsSchoolPage from "@/pages/settings-school";
import SettingsHolidaysPage from "@/pages/settings-holidays";
import SmsTemplatesPage from "@/pages/settings-sms-templates";
import SmsLogsPage from "@/pages/sms-logs";
import SchoolsPage from "@/pages/schools";
import ReportsPage from "@/pages/reports";
import UsersPage from "@/pages/users";

function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 rounded-md bg-primary animate-pulse mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            {user.role === "super_admin" && <SchoolSelector />}
            <span className="text-xs text-muted-foreground ml-2 mr-2" data-testid="text-user-role">
              {user.role.replace(/_/g, " ")}
            </span>
          </header>
          {user.role === "super_admin" && (
            <div className="border-b bg-muted/30 px-4 py-2">
              <p className="text-sm text-muted-foreground" data-testid="text-active-school-indicator">
                Viewing records for:{" "}
                <span className="font-medium text-foreground">
                  {user.school?.name || "No school selected"}
                </span>
              </p>
            </div>
          )}
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/today/:status" component={TodayStatusPage} />
              <Route path="/students/import" component={StudentsImportPage} />
              <Route path="/students" component={StudentsPage} />
              <Route path="/grade-levels" component={GradeLevelsPage} />
              <Route path="/sections" component={SectionsPage} />
              <Route path="/kiosks" component={KiosksPage} />
              <Route path="/gate/kiosks" component={GateKiosksPage} />
              <Route path="/settings/school" component={SettingsSchoolPage} />
              <Route path="/settings/holidays" component={SettingsHolidaysPage} />
              <Route path="/settings/sms-templates" component={SmsTemplatesPage} />
              <Route path="/sms-logs" component={SmsLogsPage} />
              <Route path="/schools" component={SchoolsPage} />
              <Route path="/users" component={UsersPage} />
              <Route path="/reports/:type" component={ReportsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route>
              <AuthenticatedLayout />
            </Route>
          </Switch>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
