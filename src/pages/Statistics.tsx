import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar, ClipboardList } from "lucide-react";

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#84cc16'];
const PRIORITY_COLORS: Record<string, string> = { urgent: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };

const formatBIF = (amount: number) => `${Math.round(amount).toLocaleString('fr-FR')} BIF`;

type PeriodFilter = 'all' | 'month' | 'quarter' | 'year';
type CategoryFilter = 'all' | string;

export default function Statistics() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const { data: incomeRecords, isLoading: il } = useQuery({
    queryKey: ['stats-income'],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc('get_user_company_id');
      if (!cid) return [];
      const { data } = await supabase.from('income_records').select('*').eq('company_id', cid);
      return data || [];
    },
  });

  const { data: expenseRecords, isLoading: el } = useQuery({
    queryKey: ['stats-expenses'],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc('get_user_company_id');
      if (!cid) return [];
      const { data } = await supabase.from('expense_records').select('*').eq('company_id', cid);
      return data || [];
    },
  });

  const { data: envelopes, isLoading: bl } = useQuery({
    queryKey: ['stats-envelopes'],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc('get_user_company_id');
      if (!cid) return [];
      const { data } = await supabase.from('budget_envelopes').select('*').eq('company_id', cid);
      return data || [];
    },
  });

  const { data: needsRecords, isLoading: nl } = useQuery({
    queryKey: ['stats-needs'],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc('get_user_company_id');
      if (!cid) return [];
      const { data } = await supabase.from('family_needs').select('*').eq('company_id', cid);
      return data || [];
    },
  });

  const isLoading = il || el || bl || nl;

  // Period filter helper
  const filterByPeriod = <T extends { date: string }>(records: T[]): T[] => {
    if (period === 'all') return records;
    const now = new Date();
    return records.filter(r => {
      const d = new Date(r.date);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const rq = Math.floor(d.getMonth() / 3);
        return rq === q && d.getFullYear() === now.getFullYear();
      }
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filteredIncome = useMemo(() => filterByPeriod(incomeRecords || []), [incomeRecords, period]);
  const filteredExpenses = useMemo(() => {
    let records = filterByPeriod(expenseRecords || []);
    if (categoryFilter !== 'all') {
      records = records.filter(r => r.category === categoryFilter);
    }
    return records;
  }, [expenseRecords, period, categoryFilter]);

  // All expense categories for filter dropdown
  const allCategories = useMemo(() => {
    const cats = new Set((expenseRecords || []).map(r => r.category));
    return Array.from(cats);
  }, [expenseRecords]);

  // --- Chart data ---

  // 1. Expenses by subcategory (Pie chart)
  const expensesBySubcategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(r => {
      map[r.subcategory] = (map[r.subcategory] || 0) + Number(r.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // 2. Monthly income vs expenses (Bar chart)
  const monthlyComparison = useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number }> = {};
    filteredIncome.forEach(r => {
      const key = r.date.substring(0, 7);
      if (!months[key]) months[key] = { month: key, income: 0, expenses: 0 };
      months[key].income += Number(r.amount);
    });
    filteredExpenses.forEach(r => {
      const key = r.date.substring(0, 7);
      if (!months[key]) months[key] = { month: key, income: 0, expenses: 0 };
      months[key].expenses += Number(r.amount);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredIncome, filteredExpenses]);

  // 3. Expenses by category (Pie)
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(r => {
      map[r.category] = (map[r.category] || 0) + Number(r.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  // 4. Cumulative balance over time (Line)
  const cumulativeBalance = useMemo(() => {
    const all = [
      ...filteredIncome.map(r => ({ date: r.date, amount: Number(r.amount) })),
      ...filteredExpenses.map(r => ({ date: r.date, amount: -Number(r.amount) })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    let running = 0;
    const points: { date: string; balance: number }[] = [];
    all.forEach(item => {
      running += item.amount;
      points.push({ date: item.date, balance: running });
    });
    return points;
  }, [filteredIncome, filteredExpenses]);

  // 5. Budget utilization (horizontal bars)
  const budgetUtilization = useMemo(() => {
    return (envelopes || []).map(e => ({
      name: e.subcategory,
      allocated: Number(e.allocated_amount),
      spent: Number(e.spent_amount),
      available: Number(e.allocated_amount) - Number(e.spent_amount),
      pct: Number(e.allocated_amount) > 0 ? Math.round((Number(e.spent_amount) / Number(e.allocated_amount)) * 100) : 0,
    })).filter(e => e.allocated > 0);
  }, [envelopes]);

  // 6. Needs by priority (Pie)
  const needsByPriority = useMemo(() => {
    const map: Record<string, number> = {};
    (needsRecords || []).forEach(r => {
      const p = r.priority || 'medium';
      map[p] = (map[p] || 0) + Number(r.estimated_price);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value, color: PRIORITY_COLORS[name] || '#6366f1' }));
  }, [needsRecords]);

  // 7. Needs by status (Pie)
  const needsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    (needsRecords || []).forEach(r => {
      const s = r.status || 'pending';
      map[s] = (map[s] || 0) + Number(r.estimated_price);
    });
    const statusColors: Record<string, string> = { pending: '#f59e0b', validated: '#10b981', cancelled: '#94a3b8' };
    return Object.entries(map).map(([name, value]) => ({ name, value, color: statusColors[name] || '#6366f1' }));
  }, [needsRecords]);

  const totalNeedsPending = (needsRecords || []).filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.estimated_price), 0);

  const totalIncome = filteredIncome.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = filteredExpenses.reduce((s, r) => s + Number(r.amount), 0);

  const periodLabels: Record<PeriodFilter, string> = {
    all: t.statistics.allPeriod,
    month: t.statistics.thisMonth,
    quarter: t.statistics.thisQuarter,
    year: t.statistics.thisYear,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: p.color }}>
            {p.name}: {formatBIF(p.value)}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
             <BarChart3 className="w-6 h-6" />
            {t.statistics.title}
          </h1>
          <p className="text-muted-foreground">{t.statistics.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t.statistics.allCategories} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.statistics.allCategories}</SelectItem>
              {allCategories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="text-base px-4 py-2 text-green-600 border-green-200">
          {t.statistics.income}: {formatBIF(totalIncome)}
        </Badge>
        <Badge variant="outline" className="text-base px-4 py-2 text-red-600 border-red-200">
          {t.statistics.expenses}: {formatBIF(totalExpenses)}
        </Badge>
        <Badge variant="outline" className="text-base px-4 py-2 text-blue-600 border-blue-200">
          {t.statistics.balance}: {formatBIF(totalIncome - totalExpenses)}
        </Badge>
        <Badge variant="outline" className="text-base px-4 py-2 text-amber-600 border-amber-200">
          {t.statistics.pendingNeeds}: {formatBIF(totalNeedsPending)}
        </Badge>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expenses */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Entrées vs Sorties par mois
          </h3>
          {monthlyComparison.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Expenses by Category (Pie) */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Répartition par catégorie
          </h3>
          {expensesByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBIF(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Expenses by Subcategory (Pie) */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Détail par sous-catégorie
          </h3>
          {expensesBySubcategory.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesBySubcategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {expensesBySubcategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBIF(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Cumulative Balance (Line) */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Évolution du solde
          </h3>
          {cumulativeBalance.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeBalance}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="balance" name="Solde" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Budget Utilization (full width) */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold mb-4">Utilisation du budget par enveloppe</h3>
        {budgetUtilization.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t.common.noData}</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, budgetUtilization.length * 45)}>
            <BarChart data={budgetUtilization} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="spent" name="Dépensé" fill="#ef4444" radius={[0, 4, 4, 0]} />
              <Bar dataKey="available" name="Disponible" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Needs Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs by Priority */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Besoins par priorité
          </h3>
          {needsByPriority.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={needsByPriority}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {needsByPriority.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBIF(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Needs by Status */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Besoins par statut
          </h3>
          {needsByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={needsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {needsByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBIF(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
