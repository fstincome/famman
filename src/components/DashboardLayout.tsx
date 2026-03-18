import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FinancialSidebar } from "./FinancialSidebar";
import { NotificationPopover } from "./NotificationPopover";
import { SearchResults } from "./SearchResults";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import { useGlobalSearch, SearchResult } from "@/hooks/useGlobalSearch";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userEmail, setUserEmail] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { results, isLoading } = useGlobalSearch(searchQuery);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.trim().length >= 2);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    switch (result.type) {
      case 'invoice': navigate(`/receivables?invoiceId=${result.id}`); break;
      case 'payment': navigate(`/receivables?paymentId=${result.id}`); break;
      case 'customer': navigate(`/receivables?customerId=${result.id}`); break;
      case 'contact': navigate('/'); break;
    }
  };

  const handleSignOut = async () => {
    if (isDemoUser) {
      try {
        await supabase.rpc('reset_demo_data');
      } catch (error) {
        console.error('Error resetting demo data:', error);
      }
    }
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast({ title: t.auth.signOut, description: "✓" });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FinancialSidebar />
        <div className="flex-1 flex flex-col overflow-visible">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50 overflow-visible">
            <div className="flex items-center gap-4 flex-1 overflow-visible relative">
              <SidebarTrigger className="lg:hidden" />
              <div className="relative flex-1 max-w-2xl z-50" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                <Input
                  placeholder={t.app.searchPlaceholder}
                  className="pl-10 bg-muted/50 border-none"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                />
                {showResults && <SearchResults results={results} onResultClick={handleResultClick} />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <NotificationPopover />
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                {isDemoUser ? t.auth.exitDemo : t.auth.logOut}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto relative z-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
