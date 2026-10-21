import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIncomeRecords } from "@/hooks/useIncomeRecords";
import { useBudgetEnvelopes } from "@/hooks/useBudgetEnvelopes";
import { BUDGET_CATEGORIES, ALL_SUBCATEGORIES } from "@/lib/budgetConfig";
import { logAndNotify } from "@/hooks/useActivityLogger";
import { computeIncomeAllocation, AllocationLine } from "@/lib/incomeAllocation";
import { Checkbox } from "@/components/ui/checkbox";

export default function Income() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: incomeRecords, isLoading: incomeLoading } = useIncomeRecords();
  const { envelopes, isLoading: envelopesLoading, invalidate: invalidateEnvelopes } = useBudgetEnvelopes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverDeficits, setCoverDeficits] = useState(true);
  const [summary, setSummary] = useState<{ amount: number; lines: AllocationLine[] } | null>(null);
  const totalDeficit = envelopes.reduce((s, e) => s + Math.max(0, e.spent_amount - e.allocated_amount), 0);

  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const totalIncome = incomeRecords?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const totalAllocated = envelopes.reduce((sum, e) => sum + e.allocated_amount, 0);
  const totalSpent = envelopes.reduce((sum, e) => sum + e.spent_amount, 0);
  const totalAvailable = totalAllocated - totalSpent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error("Le montant doit être supérieur à 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Pas de compte famille trouvé");

      // 1. Insert income record
      const { error: incomeError } = await supabase.from("income_records").insert({
        company_id: profile.company_id,
        amount,
        currency: "BIF",
        source: formData.source || null,
        description: formData.description || null,
        date: formData.date,
      });
      if (incomeError) throw incomeError;

      // 2. Distribute to budget envelopes (deficits first if enabled)
      const lines = computeIncomeAllocation(amount, envelopes, coverDeficits);
      for (const line of lines) {
        const allocation = line.deficitCovered + line.regular;
        const sub = ALL_SUBCATEGORIES.find(s => s.subcategory === line.subcategory)!;
        const existing = envelopes.find(e => e.subcategory === sub.subcategory);
        if (existing) {
          const { error } = await supabase
            .from("budget_envelopes")
            .update({ 
              allocated_amount: existing.allocated_amount + allocation,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("budget_envelopes")
            .insert({
              company_id: profile.company_id,
              category: sub.category,
              subcategory: sub.subcategory,
              percentage: sub.percentage,
              allocated_amount: allocation,
              spent_amount: 0,
              currency: "BIF",
            });
          if (error) throw error;
        }
      }
      setSummary({ amount, lines });


      toast.success(`${amount.toLocaleString()} BIF répartis dans les enveloppes budgétaires`);
      logAndNotify(
        { action: "create", entity_type: "income", entity_name: formData.source || "Revenu", details: { amount, date: formData.date } },
        { title: "💰 Revenu enregistré", message: `${amount.toLocaleString()} BIF — ${formData.source || "Revenu"}`, type: "success" }
      );
      queryClient.invalidateQueries({ queryKey: ["income-records"] });
      invalidateEnvelopes();
      setFormData({ amount: "", source: "", description: "", date: new Date().toISOString().split("T")[0] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBIF = (amount: number) => `${amount.toLocaleString("fr-FR")} BIF`;

  if (incomeLoading || envelopesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entrées / Revenus</h1>
          <p className="text-muted-foreground">Enregistrez vos revenus et suivez la répartition automatique</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau revenu
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total revenus</p>
                <p className="text-2xl font-bold">{formatBIF(totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponible total</p>
                <p className="text-2xl font-bold text-green-600">{formatBIF(totalAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <PiggyBank className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total dépensé</p>
                <p className="text-2xl font-bold text-orange-600">{formatBIF(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Envelopes */}
      {BUDGET_CATEGORIES.map((cat) => {
        const catEnvelopes = envelopes.filter(e => e.category === cat.name);
        const catAllocated = catEnvelopes.reduce((s, e) => s + e.allocated_amount, 0);
        const catSpent = catEnvelopes.reduce((s, e) => s + e.spent_amount, 0);

        return (
          <Card key={cat.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{cat.name} ({cat.totalPercentage}%)</CardTitle>
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">Alloué: <span className="font-semibold text-foreground">{formatBIF(catAllocated)}</span></span>
                  <span className="text-muted-foreground">Disponible: <span className="font-semibold text-green-600">{formatBIF(catAllocated - catSpent)}</span></span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {catEnvelopes.map((env) => {
                  const available = env.allocated_amount - env.spent_amount;
                  const usedPct = env.allocated_amount > 0 ? (env.spent_amount / env.allocated_amount) * 100 : 0;
                  return (
                    <div key={env.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{env.subcategory}</span>
                        <Badge variant="secondary" className="text-xs">{env.percentage}%</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${usedPct > 90 ? 'bg-destructive' : usedPct > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(usedPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium min-w-[120px] text-right">
                          {formatBIF(available)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Recent Income Records */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des revenus</CardTitle>
        </CardHeader>
        <CardContent>
          {incomeRecords && incomeRecords.length > 0 ? (
            <DataTable
              data={incomeRecords}
              columns={[
                { key: "date", header: "Date", render: (r) => new Date(r.date).toLocaleDateString("fr-FR"), getValue: (r) => r.date },
                { key: "source", header: "Source", render: (r) => r.source || "—" },
                { key: "description", header: "Description", render: (r) => r.description || "—" },
                { key: "amount", header: "Montant", render: (r) => <span className="font-semibold">{formatBIF(r.amount)}</span>, className: "text-right" },
              ] as DataTableColumn<any>[]}
              pageSize={5}
              searchPlaceholder="Rechercher un revenu..."
              emptyMessage="Aucun revenu enregistré"
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">Aucun revenu enregistré</p>
          )}
        </CardContent>
      </Card>

      {/* Add Income Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau revenu</DialogTitle>
            <DialogDescription>
              Le montant sera automatiquement réparti dans les enveloppes budgétaires
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Montant (BIF) *</label>
              <Input
                type="number"
                placeholder="Ex: 500000"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
                min="1"
              />
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="mt-2 p-3 bg-muted rounded-lg text-xs space-y-1">
                  <p className="font-medium mb-1">Répartition prévisionnelle:</p>
                  {BUDGET_CATEGORIES.map(cat => (
                    <div key={cat.name} className="flex justify-between">
                      <span>{cat.name} ({cat.totalPercentage}%)</span>
                      <span className="font-medium">
                        {formatBIF(Math.round((parseFloat(formData.amount) * cat.totalPercentage) / 100))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <Input
                placeholder="Ex: Salaire, Business..."
                value={formData.source}
                onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Note optionnelle"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : "Enregistrer et répartir"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allocation summary */}
      <Dialog open={!!summary} onOpenChange={(o) => !o && setSummary(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Récapitulatif de la répartition</DialogTitle>
            <DialogDescription>
              {summary && `${formatBIF(summary.amount)} répartis — ${formatBIF(summary.lines.reduce((s, l) => s + l.deficitCovered, 0))} utilisés pour combler des déficits`}
            </DialogDescription>
          </DialogHeader>
          {summary && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sous-catégorie</TableHead>
                  <TableHead className="text-right">Avant</TableHead>
                  <TableHead className="text-right">Déficit comblé</TableHead>
                  <TableHead className="text-right">Répartition</TableHead>
                  <TableHead className="text-right">Nouveau solde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.lines.map(l => (
                  <TableRow key={l.subcategory}>
                    <TableCell className="font-medium">{l.subcategory}</TableCell>
                    <TableCell className={`text-right ${l.before < 0 ? "text-destructive" : ""}`}>{formatBIF(l.before)}</TableCell>
                    <TableCell className="text-right">{l.deficitCovered ? formatBIF(l.deficitCovered) : "—"}</TableCell>
                    <TableCell className="text-right">{formatBIF(l.regular)}</TableCell>
                    <TableCell className={`text-right font-semibold ${l.after < 0 ? "text-destructive" : ""}`}>{formatBIF(l.after)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end"><Button onClick={() => setSummary(null)}>Fermer</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
