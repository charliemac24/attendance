import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ArrowUpCircle,
  Layers,
  ScanLine,
  ClipboardList,
  FileText,
  Settings,
  Calendar,
  MessageSquare,
  LogOut,
  School,
  Upload,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  HelpCircle,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth, hasRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  // Close the mobile sheet when a nav link is tapped.
  const { isMobile, setOpenMobile } = useSidebar();
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const initials = (user?.fullName || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const mainItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
  ];

  const todayItems = [
    { title: "Checked Out", url: "/today/present", icon: UserCheck },
    { title: "Late Arrivals", url: "/today/late", icon: Clock },
    { title: "On Campus", url: "/today/pending-checkout", icon: AlertTriangle },
    { title: "Not Checked In", url: "/today/not-checked-in-yet", icon: HelpCircle },
  ];

  const managementItems = [
    { title: "Students", url: "/students", icon: Users },
    { title: "Inactive Students", url: "/students/inactive", icon: UserX },
    { title: "Promotion", url: "/students/promotion", icon: ArrowUpCircle },
    { title: "Import Students", url: "/students/import", icon: Upload },
    { title: "Grade Levels", url: "/grade-levels", icon: GraduationCap },
    { title: "Sections", url: "/sections", icon: Layers },
    { title: "User Accounts", url: "/users", icon: Shield },
    { title: "Kiosks", url: "/kiosks", icon: ScanLine },
  ];

  const kioskItems = [
    { title: "Kiosk Scanner", url: "/gate/kiosks", icon: ScanLine },
  ];

  const reportItems = [
    { title: "Daily Report", url: "/reports/daily", icon: ClipboardList },
    { title: "Late History", url: "/reports/late-history", icon: Clock },
    { title: "Absentees", url: "/reports/absentees", icon: FileText },
    ...(user?.role === "teacher" ? [] : [{ title: "SMS Usage", url: "/reports/sms-usage", icon: MessageSquare }]),
    ...(user?.role === "super_admin" ? [{ title: "SMS Billing", url: "/reports/sms-billing", icon: MessageSquare }] : []),
  ];

  const settingsItems = [
    { title: "School Settings", url: "/settings/school", icon: Settings },
    { title: "Holidays", url: "/settings/holidays", icon: Calendar },
    { title: "SMS Templates", url: "/settings/sms-templates", icon: MessageSquare },
    { title: "SMS Logs", url: "/sms-logs", icon: MessageSquare },
  ];

  const superAdminItems = [
    { title: "Schools", url: "/schools", icon: School },
  ];

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    if (url === "/students") return location === "/students";
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9" data-testid="avatar-app-logo">
            <AvatarFallback className="bg-primary/15 text-primary font-semibold">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold" data-testid="text-app-title">MYO Attendance</h2>
            <p className="text-xs text-muted-foreground truncate">{user?.fullName}</p>
            {user?.role === "super_admin" ? (
              <p className="text-xs text-muted-foreground truncate" data-testid="text-school-name">
                Platform Admin
              </p>
            ) : user?.school ? (
              <p className="text-xs text-muted-foreground truncate" data-testid="text-school-name">
                {user.school.name}
              </p>
            ) : null}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={isActive(item.url)}>
                    <Link
                      href={item.url}
                      onClick={handleNavClick}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole(user, "super_admin", "school_admin", "gate_staff", "teacher") && (
          <SidebarGroup>
            <SidebarGroupLabel>Today's Status</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {todayItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole(user, "teacher") && (
          <SidebarGroup>
            <SidebarGroupLabel>Class View</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={isActive("/students")}>
                    <Link href="/students" onClick={handleNavClick} data-testid="link-teacher-students">
                      <Users className="h-4 w-4" />
                      <span>Students</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole(user, "super_admin", "school_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole(user, "gate_staff") && (
          <SidebarGroup>
            <SidebarGroupLabel>Kiosk</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {kioskItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole(user, "super_admin", "school_admin", "teacher") && (
          <SidebarGroup>
            <SidebarGroupLabel>Reports</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {reportItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole(user, "super_admin", "school_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole(user, "super_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
