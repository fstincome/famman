import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, PiggyBank, ShieldCheck, Users, Download, Trash2, CalendarDays, ClipboardList, Heart, CreditCard, Landmark, AlertTriangle, Activity } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { generateBackupSQL, purgeCompanyData, downloadSQL } from "@/lib/backupUtils";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { logAndNotify } from "@/hooks/useActivityLogger";
import { format, differenceInDays, isAfter, isBefore, startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

const formatBIF = (amount: number) => {
  return `${Math.round(amount).toLocaleString('fr-FR')} BIF`;
};

export default function Overview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const locale = language === "fr" ? fr : enUS;
  const [backingUp, setBackingUp] = useState(false);
  const [purging, setPurging] = useState(false);
  const [notificationsGenerated, setNotificationsGenerated] = useState(false);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const sql = await generateBackupSQL();
      downloadSQL(sql);
      toast({ title: "Backup généré", description: "Le fichier .sql a été téléchargé." });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de générer le backup.", variant: "destructive" });
    }
    setBackingUp(false);
  };

  const handlePurge = async () => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir vider toutes les données ? Cette action est irréversible.")) return;
    setPurging(true);
    try {
      await purgeCompanyData();
      queryClient.invalidateQueries();
      toast({ title: "Données vidées", description: "Toutes les données ont été supprimées." });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de vider les données.", variant: "destructive" });
    }
    setPurging(false);
  };

  // Fetch company_id
  const { data: companyId } = useQuery({
    queryKey: ['dashboard-company'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_company_id');
      return data as string | null;
    },
  });

  // Fetch all data in parallel
  const { data: incomeRecords = [], isLoading: l1 } = useQuery({
    queryKey: ['dashboard-income', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('income_records').select('*').eq('company_id', companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: expenseRecords = [], isLoading: l2 } = useQuery({
    queryKey: ['dashboard-expenses', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('expense_records').select('*').eq('company_id', companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: envelopes = [], isLoading: l3 } = useQuery({
    queryKey: ['dashboard-envelopes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('budget_envelopes').select('*').eq('company_id', companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: accounts = [], isLoading: l4 } = useQuery({
    queryKey: ['dashboard-accounts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('accounts').select('*').eq('company_id', companyId).eq('is_active', true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: needs = [], isLoading: l5 } = useQuery({
    queryKey: ['dashboard-needs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('family_needs').select('*').eq('company_id', companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: events = [], isLoading: l6 } = useQuery({
    queryKey: ['dashboard-events', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase.from('family_events').select('*').eq('company_id', companyId).gte('start_date', today).order('start_date').limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: healthRecords = [], isLoading: l7 } = useQuery({
    queryKey: ['dashboard-health', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('family_health').select('*').eq('company_id', companyId).eq('status', 'ongoing');
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: debts = [], isLoading: l8 } = useQuery({
    queryKey: ['dashboard-debts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('family_debts').select('*').eq('company_id', companyId).neq('status', 'paid');
      return data || [];
    },
    enabled: !!companyId,
  });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8;

  // Smart notifications
  useEffect(() => {
    if (isLoading || notificationsGenerated) return;
    setNotificationsGenerated(true);
    const today = new Date();

    // Debts approaching due date (within 7 days)
    debts.forEach(d => {
      if (d.due_date) {
        const daysLeft = differenceInDays(new Date(d.due_date), today);
        if (daysLeft >= 0 && daysLeft <= 7) {
          addNotification({
            title: language === "fr" ? "⏰ Échéance dette proche" : "⏰ Debt due soon",
            message: `${d.name} — ${formatBIF(Number(d.remaining_balance))} ${language === "fr" ? "dans" : "in"} ${daysLeft} ${language === "fr" ? "jours" : "days"}`,
            type: "warning",
          });
        }
        if (daysLeft < 0) {
          addNotification({
            title: language === "fr" ? "🚨 Dette en retard" : "🚨 Overdue debt",
            message: `${d.name} — ${formatBIF(Number(d.remaining_balance))} (${Math.abs(daysLeft)} ${language === "fr" ? "jours de retard" : "days overdue"})`,
            type: "error",
          });
        }
      }
    });

    // Needs validated but not purchased
    needs.filter(n => n.status === "validated").forEach(n => {
      addNotification({
        title: language === "fr" ? "✅ Besoin validé à acheter" : "✅ Validated need to purchase",
        message: `${n.title} — ${formatBIF(Number(n.estimated_price))}`,
        type: "info",
      });
    });

    // Ongoing health (medication reminders)
    healthRecords.forEach(h => {
      if (h.health_type === "medication") {
        addNotification({
          title: language === "fr" ? "💊 Médicament en cours" : "💊 Ongoing medication",
          message: `${h.title}${h.person_name ? ` (${h.person_name})` : ""}`,
          type: "info",
        });
      }
    });

    // Budget exceeded
    envelopes.forEach(e => {
      if (Number(e.allocated_amount) > 0 && Number(e.spent_amount) > Number(e.allocated_amount)) {
        addNotification({
          title: language === "fr" ? "⚠️ Budget dépassé" : "⚠️ Budget exceeded",
          message: `${e.subcategory}: ${formatBIF(Number(e.spent_amount))} / ${formatBIF(Number(e.allocated_amount))}`,
          type: "error",
        });
      }
    });
  }, [isLoading, notificationsGenerated, debts, needs, healthRecords, envelopes, language, addNotification]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const totalIncome = incomeRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = expenseRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const monthExpenses = expenseRecords.filter(e => e.date >= monthStart && e.date <= monthEnd).reduce((sum, r) => sum + Number(r.amount), 0);
  const monthIncome = incomeRecords.filter(i => i.date >= monthStart && i.date <= monthEnd).reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = totalIncome - totalExpenses;
  const totalAccountBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const pendingNeeds = needs.filter(n => n.status === "pending");
  const pendingNeedsTotal = pendingNeeds.reduce((s, n) => s + Number(n.estimated_price), 0);
  const ongoingHealthCost = healthRecords.reduce((s, h) => s + Number(h.amount), 0);

  const totalAllocated = envelopes.reduce((sum, e) => sum + Number(e.allocated_amount), 0);
  const totalSpent = envelopes.reduce((sum, e) => sum + Number(e.spent_amount), 0);
  const totalAvailable = totalAllocated - totalSpent;

  // Group envelopes by category
  const categories = envelopes.reduce((acc, env) => {
    if (!acc[env.category]) acc[env.category] = { allocated: 0, spent: 0, items: [] as typeof envelopes };
    acc[env.category].allocated += Number(env.allocated_amount);
    acc[env.category].spent += Number(env.spent_amount);
    acc[env.category].items.push(env);
    return acc;
  }, {} as Record<string, { allocated: number; spent: number; items: typeof envelopes }>);

  // Recent transactions
  const recentIncome = incomeRecords.slice(-5).map(r => ({
    id: r.id, date: r.date, amount: Number(r.amount), type: 'income' as const,
    description: r.description || r.source || 'Revenu',
  }));
  const recentExpense = expenseRecords.slice(-5).map(r => ({
    id: r.id, date: r.date, amount: Number(r.amount), type: 'expense' as const,
    description: r.description || `${r.category} - ${r.subcategory}`,
  }));
  const recentTransactions = [...recentIncome, ...recentExpense]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const categoryIcons: Record<string, typeof Wallet> = {
    'Charges essentielles': ShieldCheck,
    'Famille & stabilité': Users,
    'Épargne & progression': PiggyBank,
  };
  const categoryColors: Record<string, string> = {
    'Charges essentielles': 'from-red-500 to-orange-500',
    'Famille & stabilité': 'from-blue-500 to-indigo-500',
    'Épargne & progression': 'from-green-500 to-emerald-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
          <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackup} disabled={backingUp} className="gap-2">
            <Download className="w-4 h-4" />
            {backingUp ? '...' : 'Backup'}
          </Button>
          <Button variant="destructive" onClick={handlePurge} disabled={purging} className="gap-2">
            <Trash2 className="w-4 h-4" />
            {purging ? '...' : language === "fr" ? 'Vider' : 'Purge'}
          </Button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">{language === "fr" ? "Solde comptes" : "Account balance"}</span>
          </div>
          <p className="text-xl font-bold">{formatBIF(totalAccountBalance)}</p>
          <p className="text-xs text-muted-foreground">{accounts.length} {language === "fr" ? "comptes actifs" : "active accounts"}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-muted-foreground">{language === "fr" ? "Revenus ce mois" : "Income this month"}</span>
          </div>
          <p className="text-xl font-bold text-green-600">{formatBIF(monthIncome)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs text-muted-foreground">{language === "fr" ? "Dépenses ce mois" : "Expenses this month"}</span>
          </div>
          <p className="text-xl font-bold text-red-600">{formatBIF(monthExpenses)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
            <span className="text-xs text-muted-foreground">{t.dashboard.netBalance}</span>
          </div>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatBIF(balance)}</p>
        </Card>
      </div>

      {/* Quick Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Needs */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-sm">{language === "fr" ? "Besoins en attente" : "Pending Needs"}</h3>
            <Badge variant="secondary" className="ml-auto">{pendingNeeds.length}</Badge>
          </div>
          {pendingNeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{language === "fr" ? "Aucun besoin en attente" : "No pending needs"}</p>
          ) : (
            <div className="space-y-2">
              {pendingNeeds.slice(0, 4).map(n => (
                <div key={n.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{n.title}</span>
                  <Badge variant={n.priority === "high" ? "destructive" : n.priority === "medium" ? "default" : "secondary"} className="text-xs ml-2">{n.priority}</Badge>
                </div>
              ))}
              {pendingNeeds.length > 4 && <p className="text-xs text-muted-foreground">+{pendingNeeds.length - 4} {language === "fr" ? "autres" : "more"}</p>}
              <p className="text-sm font-semibold text-orange-600 mt-1">{language === "fr" ? "Total estimé" : "Estimated"}: {formatBIF(pendingNeedsTotal)}</p>
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-sm">{t.dashboard.upcomingEvents}</h3>
            <Badge variant="secondary" className="ml-auto">{events.length}</Badge>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{language === "fr" ? "Aucun événement à venir" : "No upcoming events"}</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{e.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{format(new Date(e.start_date), "d MMM", { locale })}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Ongoing Health */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-sm">{language === "fr" ? "Santé en cours" : "Ongoing Health"}</h3>
            <Badge variant="secondary" className="ml-auto">{healthRecords.length}</Badge>
          </div>
          {healthRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">{language === "fr" ? "Aucun traitement en cours" : "No ongoing treatments"}</p>
          ) : (
            <div className="space-y-2">
              {healthRecords.slice(0, 4).map(h => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{h.title}{h.person_name ? ` (${h.person_name})` : ""}</span>
                  <span className="text-xs font-medium">{formatBIF(Number(h.amount))}</span>
                </div>
              ))}
              <p className="text-sm font-semibold text-red-600 mt-1">{language === "fr" ? "Coût total" : "Total cost"}: {formatBIF(ongoingHealthCost)}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Debts Alert */}
      {debts.length > 0 && (
        <Card className="p-5 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-sm">{language === "fr" ? "Dettes en cours" : "Active Debts"}</h3>
            <Badge variant="destructive" className="ml-auto">{debts.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {debts.slice(0, 6).map(d => {
              const daysLeft = d.due_date ? differenceInDays(new Date(d.due_date), new Date()) : null;
              return (
                <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded bg-background">
                  <div className="truncate flex-1">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground"> → {d.counterparty}</span>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-semibold text-xs">{formatBIF(Number(d.remaining_balance))}</p>
                    {daysLeft !== null && (
                      <p className={`text-xs ${daysLeft < 0 ? 'text-red-600 font-bold' : daysLeft <= 7 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}j ${language === "fr" ? "retard" : "late"}` : `${daysLeft}j`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Budget Envelopes by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.entries(categories).map(([catName, catData]) => {
          const Icon = categoryIcons[catName] || Wallet;
          const gradient = categoryColors[catName] || 'from-gray-500 to-gray-600';
          const available = catData.allocated - catData.spent;
          return (
            <Card key={catName} className="overflow-hidden">
              <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5" />
                  <h3 className="font-semibold">{catName}</h3>
                </div>
                <p className="text-2xl font-bold">{formatBIF(available)}</p>
                <p className="text-sm opacity-80">{language === "fr" ? "disponible sur" : "available of"} {formatBIF(catData.allocated)}</p>
              </div>
              <div className="p-4 space-y-3">
                {catData.items.map(env => {
                  const pct = Number(env.allocated_amount) > 0 ? (Number(env.spent_amount) / Number(env.allocated_amount)) * 100 : 0;
                  return (
                    <div key={env.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{env.subcategory}</span>
                        <span className="text-muted-foreground">{formatBIF(Number(env.allocated_amount) - Number(env.spent_amount))}</span>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {Object.keys(categories).length === 0 && (
          <Card className="col-span-full p-8 text-center">
            <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{language === "fr" ? "Aucune enveloppe. Enregistrez un revenu pour initialiser." : "No envelopes. Record income to initialize."}</p>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold mb-4">{t.dashboard.recentTransactions}</h3>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t.common.noData}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4 text-green-600" /> : <ArrowDownLeft className="w-4 h-4 text-red-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatBIF(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
