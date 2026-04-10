import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

const formatBIF = (n: number) => n.toLocaleString("fr-BI") + " BIF";

const Reports = () => {
  const { t, language } = useLanguage();
  const [reportMonth, setReportMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const { data: incomes = [] } = useQuery({
    queryKey: ["report-incomes"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("income_records").select("*").eq("company_id", profile.company_id).order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["report-expenses"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("expense_records").select("*").eq("company_id", profile.company_id).order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ["report-envelopes"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("budget_envelopes").select("*").eq("company_id", profile.company_id);
      return data || [];
    },
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["report-debts"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("family_debts").select("*").eq("company_id", profile.company_id);
      return data || [];
    },
  });

  const { data: needs = [] } = useQuery({
    queryKey: ["report-needs"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("family_needs").select("*").eq("company_id", profile.company_id);
      return data || [];
    },
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["report-health"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("family_health").select("*").eq("company_id", profile.company_id);
      return data || [];
    },

  const totalIncome = incomes.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const totalBudget = envelopes.reduce((s, e) => s + Number(e.allocated_amount), 0);
  const totalSpent = envelopes.reduce((s, e) => s + Number(e.spent_amount), 0);
  const totalDebtBalance = debts.filter(d => d.debt_type === "debt").reduce((s, d) => s + Number(d.remaining_balance), 0);
  const totalCreditBalance = debts.filter(d => d.debt_type === "credit").reduce((s, d) => s + Number(d.remaining_balance), 0);

  const generateIncomeExpenseReport = (fmt: "csv" | "excel" | "pdf") => {
    // Group expenses by category
    const expByCategory: Record<string, number> = {};
    expenses.forEach(e => { expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount); });

    const rows = [
      { Catégorie: "REVENUS TOTAUX", Montant: formatBIF(totalIncome) },
      ...incomes.slice(0, 20).map(i => ({ Catégorie: `  ${i.source || "Revenu"} (${i.date})`, Montant: formatBIF(Number(i.amount)) })),
      { Catégorie: "", Montant: "" },
      { Catégorie: "DÉPENSES TOTALES", Montant: formatBIF(totalExpenses) },
      ...Object.entries(expByCategory).map(([cat, amt]) => ({ Catégorie: `  ${cat}`, Montant: formatBIF(amt) })),
      { Catégorie: "", Montant: "" },
      { Catégorie: "SOLDE NET", Montant: formatBIF(totalIncome - totalExpenses) },
    ];

    const ts = new Date().toISOString().slice(0, 10);
    const filename = `Revenus_Depenses_${ts}`;
    if (fmt === "csv") exportToCSV(rows, filename);
    else if (fmt === "excel") exportToExcel(rows, filename, "Revenus & Dépenses");
    else exportToPDF("Rapport Revenus & Dépenses", ["Catégorie", "Montant"], rows.map(r => [r.Catégorie, r.Montant]), filename);
  };

  const generateBudgetReport = (fmt: "csv" | "excel" | "pdf") => {
    const rows = envelopes.map(e => ({
      Catégorie: e.category,
      "Sous-catégorie": e.subcategory,
      Alloué: formatBIF(Number(e.allocated_amount)),
      Dépensé: formatBIF(Number(e.spent_amount)),
      Disponible: formatBIF(Number(e.allocated_amount) - Number(e.spent_amount)),
      "% utilisé": Number(e.allocated_amount) > 0 ? Math.round((Number(e.spent_amount) / Number(e.allocated_amount)) * 100) + "%" : "0%",
    }));

    const ts = new Date().toISOString().slice(0, 10);
    const filename = `Budget_${ts}`;
    if (fmt === "csv") exportToCSV(rows, filename);
    else if (fmt === "excel") exportToExcel(rows, filename, "Budget");
    else exportToPDF("Rapport Budget", ["Catégorie", "Sous-catégorie", "Alloué", "Dépensé", "Disponible", "% utilisé"], rows.map(r => [r.Catégorie, r["Sous-catégorie"], r.Alloué, r.Dépensé, r.Disponible, r["% utilisé"]]), filename);
  };

  const generateDebtReport = (fmt: "csv" | "excel" | "pdf") => {
    const rows = debts.map(d => ({
      Nom: d.name,
      Type: d.debt_type === "debt" ? "Dette" : "Créance",
      Contrepartie: d.counterparty,
      "Montant initial": formatBIF(Number(d.original_amount)),
      "Reste à payer": formatBIF(Number(d.remaining_balance)),
      Statut: d.status === "paid" ? "Payé" : "En cours",
    }));

    const ts = new Date().toISOString().slice(0, 10);
    const filename = `Dettes_Creances_${ts}`;
    if (fmt === "csv") exportToCSV(rows, filename);
    else if (fmt === "excel") exportToExcel(rows, filename, "Dettes & Créances");
    else exportToPDF("Rapport Dettes & Créances", ["Nom", "Type", "Contrepartie", "Montant initial", "Reste à payer", "Statut"], rows.map(r => [r.Nom, r.Type, r.Contrepartie, r["Montant initial"], r["Reste à payer"], r.Statut]), filename);
  };

  const generateMonthlyReport = (fmt: "csv" | "excel" | "pdf") => {
    const [year, month] = reportMonth.split("-").map(Number);
    const mStart = startOfMonth(new Date(year, month - 1));
    const mEnd = endOfMonth(mStart);
    const mStartStr = format(mStart, "yyyy-MM-dd");
    const mEndStr = format(mEnd, "yyyy-MM-dd");
    const monthLabel = format(mStart, "MMMM yyyy");

    const monthIncomes = incomes.filter(i => i.date >= mStartStr && i.date <= mEndStr);
    const monthExpenses = expenses.filter(e => e.date >= mStartStr && e.date <= mEndStr);
    const monthHealth = healthRecords.filter(h => h.date >= mStartStr && h.date <= mEndStr);
    const satisfiedNeeds = needs.filter(n => n.status === "validated");
    const pendingNeeds = needs.filter(n => n.status === "pending");

    const mIncome = monthIncomes.reduce((s, r) => s + Number(r.amount), 0);
    const mExpense = monthExpenses.reduce((s, r) => s + Number(r.amount), 0);
    const mHealth = monthHealth.reduce((s, r) => s + Number(r.amount), 0);
    const mDebtBalance = debts.filter(d => d.debt_type === "debt").reduce((s, d) => s + Number(d.remaining_balance), 0);

    const rows = [
      { Section: `RAPPORT MENSUEL — ${monthLabel.toUpperCase()}`, Détail: "" },
      { Section: "", Détail: "" },
      { Section: "💰 REVENUS", Détail: formatBIF(mIncome) },
      ...monthIncomes.map(i => ({ Section: `  ${i.source || "Revenu"} (${i.date})`, Détail: formatBIF(Number(i.amount)) })),
      { Section: "", Détail: "" },
      { Section: "💸 DÉPENSES", Détail: formatBIF(mExpense) },
      ...monthExpenses.slice(0, 30).map(e => ({ Section: `  ${e.category} - ${e.subcategory} (${e.date})`, Détail: formatBIF(Number(e.amount)) })),
      { Section: "", Détail: "" },
      { Section: "📊 SOLDE NET", Détail: formatBIF(mIncome - mExpense) },
      { Section: "", Détail: "" },
      { Section: "✅ BESOINS SATISFAITS", Détail: `${satisfiedNeeds.length}` },
      ...satisfiedNeeds.map(n => ({ Section: `  ${n.title}`, Détail: formatBIF(Number(n.estimated_price)) })),
      { Section: "⏳ BESOINS EN ATTENTE", Détail: `${pendingNeeds.length}` },
      ...pendingNeeds.map(n => ({ Section: `  ${n.title} (${n.priority})`, Détail: formatBIF(Number(n.estimated_price)) })),
      { Section: "", Détail: "" },
      { Section: "💳 DETTES RESTANTES", Détail: formatBIF(mDebtBalance) },
      ...debts.filter(d => d.debt_type === "debt" && d.status !== "paid").map(d => ({ Section: `  ${d.name} → ${d.counterparty}`, Détail: formatBIF(Number(d.remaining_balance)) })),
      { Section: "", Détail: "" },
      { Section: "🏥 DÉPENSES SANTÉ", Détail: formatBIF(mHealth) },
      ...monthHealth.map(h => ({ Section: `  ${h.title} (${h.person_name || ""})`, Détail: formatBIF(Number(h.amount)) })),
    ];

    const filename = `Rapport_Mensuel_${reportMonth}`;
    if (fmt === "csv") exportToCSV(rows, filename);
    else if (fmt === "excel") exportToExcel(rows, filename, "Rapport Mensuel");
    else exportToPDF(`Rapport Mensuel — ${monthLabel}`, ["Section", "Détail"], rows.map(r => [r.Section, r.Détail]), filename);
  };

  const handleDownload = (reportId: string, fmt: "csv" | "excel" | "pdf") => {
    try {
      if (reportId === "income-expense") generateIncomeExpenseReport(fmt);
      else if (reportId === "budget") generateBudgetReport(fmt);
      else if (reportId === "debt") generateDebtReport(fmt);
      else if (reportId === "monthly") generateMonthlyReport(fmt);
      toast({ title: "✓", description: "Rapport téléchargé avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Échec du téléchargement", variant: "destructive" });
    }
  };

  const reports = [
    {
      id: "income-expense",
      name: "Revenus & Dépenses",
      description: "Synthèse des revenus et dépenses par catégorie",
      icon: TrendingUp,
      stats: `${formatBIF(totalIncome)} revenus · ${formatBIF(totalExpenses)} dépenses`,
    },
    {
      id: "budget",
      name: "Suivi Budget",
      description: "État des enveloppes budgétaires et consommation",
      icon: Wallet,
      stats: `${formatBIF(totalSpent)} / ${formatBIF(totalBudget)} utilisé`,
    },
    {
      id: "debt",
      name: "Dettes & Créances",
      description: "Situation des dettes et créances en cours",
      icon: TrendingDown,
      stats: `${formatBIF(totalDebtBalance)} dettes · ${formatBIF(totalCreditBalance)} créances`,
    },
    {
      id: "monthly",
      name: t.monthlyReport.title,
      description: language === "fr" ? "Synthèse mensuelle complète : revenus, dépenses, besoins, dettes, santé" : "Full monthly summary: income, expenses, needs, debts, health",
      icon: CalendarDays,
      stats: `${t.monthlyReport.month}: ${reportMonth}`,
      hasMonthPicker: true,
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rapports & Export</h1>
        <p className="text-muted-foreground">Générez et téléchargez vos rapports financiers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Solde Net</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-destructive"}`}>{formatBIF(totalIncome - totalExpenses)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Budget Disponible</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{formatBIF(totalBudget - totalSpent)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dettes Restantes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{formatBIF(totalDebtBalance)}</p></CardContent>
        </Card>
      </div>

      {/* Reports */}
      <div className="grid gap-4 md:grid-cols-3">
        {reports.map(report => (
          <Card key={report.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <report.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{report.stats}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(report.id, "pdf")}>
                  <Download className="w-3 h-3 mr-1" />PDF
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(report.id, "excel")}>
                  <Download className="w-3 h-3 mr-1" />Excel
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(report.id, "csv")}>
                  <Download className="w-3 h-3 mr-1" />CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Export */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Export Complet</h3>
            <p className="text-sm text-muted-foreground">Télécharger tous les rapports d'un coup</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { handleDownload("income-expense", "pdf"); handleDownload("budget", "pdf"); handleDownload("debt", "pdf"); }}>
              <FileText className="w-4 h-4 mr-2" />Tout en PDF
            </Button>
            <Button variant="outline" onClick={() => { handleDownload("income-expense", "excel"); handleDownload("budget", "excel"); handleDownload("debt", "excel"); }}>
              <FileText className="w-4 h-4 mr-2" />Tout en Excel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
