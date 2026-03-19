import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, PiggyBank, ShieldCheck, Users, Download, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { generateBackupSQL, purgeCompanyData, downloadSQL } from "@/lib/backupUtils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const formatBIF = (amount: number) => {
  return `${Math.round(amount).toLocaleString('fr-FR')} BIF`;
};

export default function Overview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [backingUp, setBackingUp] = useState(false);
  const [purging, setPurging] = useState(false);

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
    if (!confirm("⚠️ Êtes-vous sûr de vouloir vider toutes les données ? Cette action est irréversible. Assurez-vous d'avoir fait un backup d'abord.")) return;
    setPurging(true);
    try {
      await purgeCompanyData();
      queryClient.invalidateQueries();
      toast({ title: "Données vidées", description: "Toutes les données ont été supprimées (compte utilisateur conservé)." });
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de vider les données.", variant: "destructive" });
    }
    setPurging(false);
  };

  const { t } = useLanguage();
  // Fetch income records
  const { data: incomeRecords, isLoading: incomeLoading } = useQuery({
    queryKey: ['dashboard-income'],
    queryFn: async () => {
      const { data: profile } = await supabase.rpc('get_user_company_id');
      if (!profile) return [];
      const { data } = await supabase
        .from('income_records')
        .select('*')
        .eq('company_id', profile);
      return data || [];
    },
  });

  // Fetch expense records
  const { data: expenseRecords, isLoading: expenseLoading } = useQuery({
    queryKey: ['dashboard-expenses'],
    queryFn: async () => {
      const { data: profile } = await supabase.rpc('get_user_company_id');
      if (!profile) return [];
      const { data } = await supabase
        .from('expense_records')
        .select('*')
        .eq('company_id', profile);
      return data || [];
    },
  });

  // Fetch budget envelopes
  const { data: envelopes, isLoading: envelopesLoading } = useQuery({
    queryKey: ['dashboard-envelopes'],
    queryFn: async () => {
      const { data: profile } = await supabase.rpc('get_user_company_id');
      if (!profile) return [];
      const { data } = await supabase
        .from('budget_envelopes')
        .select('*')
        .eq('company_id', profile);
      return data || [];
    },
  });

  const isLoading = incomeLoading || expenseLoading || envelopesLoading;

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

  const totalIncome = incomeRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const totalExpenses = expenseRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const balance = totalIncome - totalExpenses;

  // Group envelopes by category
  const categories = envelopes?.reduce((acc, env) => {
    if (!acc[env.category]) acc[env.category] = { allocated: 0, spent: 0, items: [] };
    acc[env.category].allocated += Number(env.allocated_amount);
    acc[env.category].spent += Number(env.spent_amount);
    acc[env.category].items.push(env);
    return acc;
  }, {} as Record<string, { allocated: number; spent: number; items: typeof envelopes }>);

  const totalAllocated = envelopes?.reduce((sum, e) => sum + Number(e.allocated_amount), 0) || 0;
  const totalSpent = envelopes?.reduce((sum, e) => sum + Number(e.spent_amount), 0) || 0;
  const totalAvailable = totalAllocated - totalSpent;

  // Recent transactions (last 5 income + expenses merged)
  const recentIncome = (incomeRecords || []).slice(-5).map(r => ({
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    type: 'income' as const,
    description: r.description || r.source || 'Revenu',
  }));
  const recentExpense = (expenseRecords || []).slice(-5).map(r => ({
    id: r.id,
    date: r.date,
    amount: Number(r.amount),
    type: 'expense' as const,
    description: r.description || `${r.category} - ${r.subcategory}`,
  }));
  const recentTransactions = [...recentIncome, ...recentExpense]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

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
            {backingUp ? 'Génération...' : 'Backup .sql'}
          </Button>
          <Button variant="destructive" onClick={handlePurge} disabled={purging} className="gap-2">
            <Trash2 className="w-4 h-4" />
            {purging ? 'Suppression...' : 'Vider les données'}
          </Button>
        </div>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenus */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <Badge variant="outline" className="text-green-600 border-green-200">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Entrées
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{t.dashboard.totalIncome}</p>
          <p className="text-2xl font-bold text-green-600">{formatBIF(totalIncome)}</p>
        </Card>

        {/* Total Dépenses */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <Badge variant="outline" className="text-red-600 border-red-200">
              <ArrowDownLeft className="w-3 h-3 mr-1" /> Sorties
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{t.dashboard.totalExpenses}</p>
          <p className="text-2xl font-bold text-red-600">{formatBIF(totalExpenses)}</p>
        </Card>

        {/* Solde Net */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{t.dashboard.netBalance}</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatBIF(balance)}
          </p>
        </Card>

        {/* Budget Disponible */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Budget disponible</p>
          <p className="text-2xl font-bold text-purple-600">{formatBIF(totalAvailable)}</p>
          {totalAllocated > 0 && (
            <Progress value={(totalSpent / totalAllocated) * 100} className="mt-2 h-2" />
          )}
        </Card>
      </div>

      {/* Budget Envelopes by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {categories && Object.entries(categories).map(([catName, catData]) => {
          const Icon = categoryIcons[catName] || Wallet;
          const gradient = categoryColors[catName] || 'from-gray-500 to-gray-600';
          const percentage = catData.allocated > 0 ? (catData.spent / catData.allocated) * 100 : 0;
          const available = catData.allocated - catData.spent;

          return (
            <Card key={catName} className="overflow-hidden">
              <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5" />
                  <h3 className="font-semibold">{catName}</h3>
                </div>
                <p className="text-2xl font-bold">{formatBIF(available)}</p>
                <p className="text-sm opacity-80">disponible sur {formatBIF(catData.allocated)}</p>
              </div>
              <div className="p-4 space-y-3">
                {catData.items.map((env) => {
                  const envPct = Number(env.allocated_amount) > 0
                    ? (Number(env.spent_amount) / Number(env.allocated_amount)) * 100
                    : 0;
                  return (
                    <div key={env.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{env.subcategory}</span>
                        <span className="text-muted-foreground">
                          {formatBIF(Number(env.allocated_amount) - Number(env.spent_amount))}
                        </span>
                      </div>
                      <Progress value={envPct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {(!categories || Object.keys(categories).length === 0) && (
          <Card className="col-span-full p-8 text-center">
            <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Aucune enveloppe budgétaire. Enregistrez un revenu pour initialiser vos budgets.
            </p>
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
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
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
