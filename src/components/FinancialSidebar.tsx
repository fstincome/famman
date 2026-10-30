import { useEffect, useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { CSVUploader } from "@/components/CSVUploader";
import { LayoutDashboard, TrendingUp, Receipt, Building2, Calendar, Rocket, CreditCard, FileText, Upload, Users, BarChart3, BookUser, Landmark, ClipboardList, Heart, CalendarDays, Repeat, UserSquare2, ArrowLeftRight, PiggyBank, FileCheck, ChevronDown, type LucideIcon } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import logoImg from "@/assets/logo.png";

type NavItem = { title: string; url: string; icon: LucideIcon };
type NavGroup = { key: string; label: string; items: NavItem[] };

export function FinancialSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const handleNavClick = () => { if (isMobile) setOpenMobile(false); };
  const currentPath = location.pathname;
  const [csvUploaderOpen, setCsvUploaderOpen] = useState(false);
  const collapsed = state === "collapsed";
  const { t } = useLanguage();

  const navGroups: NavGroup[] = [
    {
      key: "home",
      label: t.nav.groupHome,
      items: [
        { title: t.nav.dashboard, url: "/", icon: LayoutDashboard },
        { title: t.nav.calendar, url: "/calendar", icon: CalendarDays },
      ],
    },
    {
      key: "finances",
      label: t.nav.groupFinances,
      items: [
        { title: t.nav.income, url: "/income", icon: TrendingUp },
        { title: t.nav.expenses, url: "/expenses", icon: Receipt },
        { title: t.nav.bankAccounts, url: "/bank-accounts", icon: Landmark },
        { title: "Épargne", url: "/savings", icon: PiggyBank },
        { title: "Récurrences", url: "/recurring", icon: Repeat },
        { title: t.nav.debts, url: "/debts", icon: CreditCard },
        { title: t.nav.patrimony, url: "/patrimony", icon: Building2 },
      ],
    },
    {
      key: "analysis",
      label: t.nav.groupAnalysis,
      items: [
        { title: t.nav.statistics, url: "/statistics", icon: BarChart3 },
        { title: "Comparaisons", url: "/comparisons", icon: ArrowLeftRight },
        { title: t.nav.reports, url: "/reports", icon: FileText },
      ],
    },
    {
      key: "family",
      label: t.nav.groupFamily,
      items: [
        { title: t.nav.events, url: "/events", icon: Calendar },
        { title: t.nav.projects, url: "/projects", icon: Rocket },
        { title: t.nav.contacts, url: "/contacts", icon: BookUser },
        { title: "Membres famille", url: "/members", icon: UserSquare2 },
        { title: t.nav.needs, url: "/needs", icon: ClipboardList },
        { title: t.nav.health, url: "/health", icon: Heart },
      ],
    },
    {
      key: "opportunities",
      label: t.nav.groupOpportunities,
      items: [
        { title: "Candidatures", url: "/applications", icon: FileCheck },
      ],
    },
    {
      key: "admin",
      label: t.nav.groupAdmin,
      items: [
        { title: t.nav.admin, url: "/admin", icon: Users },
      ],
    },
  ];

  const allItems = navGroups.flatMap(g => g.items);

  const activeGroupKey = navGroups.find(g => g.items.some(i => isActive(i.url)))?.key;
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    navGroups.filter(g => g.items.some(i => isActive(i.url))).map(g => g.key)
  );

  // Re-open the group of the active page after navigation (incl. browser back/forward).
  useEffect(() => {
    if (activeGroupKey) {
      setOpenGroups(prev => (prev.includes(activeGroupKey) ? prev : [...prev, activeGroupKey]));
    }
  }, [activeGroupKey]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  function isActive(path: string) {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  }

  const getNavClasses = (path: string) => {
    const active = isActive(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`;
  };

  const getIconClasses = (path: string) => {
    const active = isActive(path);
    return `w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`;
  };

  const renderNavItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <NavLink to={item.url} onClick={handleNavClick} className={getNavClasses(item.url)}>
          <item.icon className={getIconClasses(item.url)} />
          {!collapsed && <span className="font-medium">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

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
        {collapsed ? (
          // Icon-only flat list when the sidebar is collapsed
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {allItems.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          navGroups.map(group => {
            const groupActive = group.items.some(i => isActive(i.url));
            const isOpen = openGroups.includes(group.key);
            return (
              <Collapsible
                key={group.key}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.key)}
                className={group.key === "home" ? "" : "mt-4"}
              >
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel
                      className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wide cursor-pointer select-none py-2 rounded-md px-2 transition-colors ${groupActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {group.label}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="space-y-1 pl-2">
                        {group.items.map(renderNavItem)}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })
        )}

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
