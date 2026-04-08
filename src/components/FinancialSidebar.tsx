import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { CSVUploader } from "@/components/CSVUploader";
import { LayoutDashboard, TrendingUp, Receipt, Building2, Calendar, Rocket, CreditCard, FileText, Upload, Settings, Users, BarChart3, BookUser, Landmark, ClipboardList } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import logoImg from "@/assets/logo.png";

export function FinancialSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [csvUploaderOpen, setCsvUploaderOpen] = useState(false);
  const collapsed = state === "collapsed";
  const { t } = useLanguage();

  const mainNavItems = [
    { title: t.nav.dashboard, url: "/", icon: LayoutDashboard },
    { title: t.nav.income, url: "/income", icon: TrendingUp },
    { title: t.nav.expenses, url: "/expenses", icon: Receipt },
    { title: t.nav.statistics, url: "/statistics", icon: BarChart3 },
    { title: t.nav.patrimony, url: "/patrimony", icon: Building2 },
    { title: t.nav.events, url: "/events", icon: Calendar },
    { title: t.nav.projects, url: "/projects", icon: Rocket },
    { title: t.nav.debts, url: "/debts", icon: CreditCard },
    { title: t.nav.contacts, url: "/contacts", icon: BookUser },
    { title: t.nav.bankAccounts, url: "/bank-accounts", icon: Landmark },
    { title: t.nav.needs, url: "/needs", icon: ClipboardList },
    { title: t.nav.reports, url: "/reports", icon: FileText },
  ];

  const adminNavItems = [
    { title: t.nav.admin, url: "/admin", icon: Users },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) => {
    const active = isActive(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`;
  };

  const getIconClasses = (path: string) => {
    const active = isActive(path);
    return `w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`;
  };

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-sidebar-border bg-sidebar transition-all duration-300`}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Logiciel Familial" className="w-9 h-9 rounded-lg object-contain" />
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sidebar-foreground">{t.app.name}</h2>
              <p className="text-xs text-muted-foreground">{t.app.tagline}</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className={`text-xs font-medium text-muted-foreground mb-3 ${collapsed ? "hidden" : ""}`}>
            NAVIGATION
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClasses(item.url)}>
                      <item.icon className={getIconClasses(item.url)} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className={`text-xs font-medium text-muted-foreground mb-3 ${collapsed ? "hidden" : ""}`}>
            ADMIN
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {adminNavItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClasses(item.url)}>
                      <item.icon className={getIconClasses(item.url)} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            {!collapsed && (
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-left h-auto py-2" onClick={() => setCsvUploaderOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  {t.app.uploadCSV}
                </Button>
                <CSVUploader open={csvUploaderOpen} onOpenChange={setCsvUploaderOpen} />
              </div>
            )}
            {collapsed && (
              <Button variant="ghost" size="sm" className="w-full p-2" onClick={() => setCsvUploaderOpen(true)}>
                <Upload className="w-4 h-4" />
              </Button>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
