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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingDown, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { EnvelopeTransferDialog } from "@/components/EnvelopeTransferDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useExpenseRecords } from "@/hooks/useExpenseRecords";
import { useBudgetEnvelopes } from "@/hooks/useBudgetEnvelopes";
import { BUDGET_CATEGORIES, getCategoryForSubcategory } from "@/lib/budgetConfig";
import { logAndNotify } from "@/hooks/useActivityLogger";

export default function Expenses() {
  const queryClient = useQueryClient();
  const { data: expenseRecords, isLoading: expensesLoading } = useExpenseRecords();
  const { envelopes, isLoading: envelopesLoading, getAvailableAmount, invalidate: invalidateEnvelopes } = useBudgetEnvelopes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const totalSpent = expenseRecords?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const totalAllocated = envelopes.reduce((sum, e) => sum + e.allocated_amount, 0);
  const totalAvailable = totalAllocated - envelopes.reduce((sum, e) => sum + e.spent_amount, 0);

  const selectedCategoryData = BUDGET_CATEGORIES.find(c => c.name === selectedCategory);
  const availableForSubcategory = selectedSubcategory ? getAvailableAmount(selectedSubcategory) : 0;
  const requestedAmount = parseFloat(formData.amount) || 0;
  const isOverBudget = requestedAmount > availableForSubcategory && selectedSubcategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !selectedSubcategory) {
      toast.error("Veuillez choisir une catégorie et sous-catégorie");
      return;
    }
    if (requestedAmount <= 0) {
      toast.error("Le montant doit être supérieur à 0");
      return;
    }
    if (requestedAmount > availableForSubcategory) {
      toast.warning(`Dépassement de ${(requestedAmount - availableForSubcategory).toLocaleString("fr-FR")} BIF — sera compensé par les prochains revenus ou un transfert`);
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

      // 1. Insert expense record
      const { error: expenseError } = await supabase.from("expense_records").insert({
        company_id: profile.company_id,
        amount: requestedAmount,
        currency: "BIF",
        category: selectedCategory,
        subcategory: selectedSubcategory,
        description: formData.description || null,
        date: formData.date,
      });
      if (expenseError) throw expenseError;

      // 2. Update budget envelope spent_amount
      const envelope = envelopes.find(e => e.subcategory === selectedSubcategory);
      if (envelope) {
        const { error } = await supabase
          .from("budget_envelopes")
          .update({
            spent_amount: envelope.spent_amount + requestedAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", envelope.id);
        if (error) throw error;
      }

      toast.success(`${requestedAmount.toLocaleString("fr-FR")} BIF dépensé dans ${selectedSubcategory}`);
      logAndNotify(
        { action: "create", entity_type: "expense", entity_name: selectedSubcategory, details: { amount: requestedAmount, category: selectedCategory, subcategory: selectedSubcategory } },
        { title: "📉 Dépense enregistrée", message: `${requestedAmount.toLocaleString("fr-FR")} BIF — ${selectedSubcategory}`, type: "info" }
      );
      queryClient.invalidateQueries({ queryKey: ["expense-records"] });
      invalidateEnvelopes();
      setFormData({ amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      setSelectedCategory("");
      setSelectedSubcategory("");
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBIF = (amount: number) => `${amount.toLocaleString("fr-FR")} BIF`;

  if (expensesLoading || envelopesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group expenses by category for summary
  const expensesByCategory = expenseRecords?.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = { total: 0, items: [] };
    acc[r.category].total += r.amount;
    acc[r.category].items.push(r);
    return acc;
  }, {} as Record<string, { total: number; items: typeof expenseRecords }>) || {};

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorties / Dépenses</h1>
          <p className="text-muted-foreground">Gérez vos dépenses par catégorie avec contrôle budgétaire</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Transférer
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle dépense
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total dépensé</p>
                <p className="text-2xl font-bold">{formatBIF(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget disponible</p>
                <p className="text-2xl font-bold text-green-600">{formatBIF(totalAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget total alloué</p>
                <p className="text-2xl font-bold">{formatBIF(totalAllocated)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Status per Category */}
      {BUDGET_CATEGORIES.map((cat) => {
        const catEnvelopes = envelopes.filter(e => e.category === cat.name);
        const catAllocated = catEnvelopes.reduce((s, e) => s + e.allocated_amount, 0);
        const catSpent = catEnvelopes.reduce((s, e) => s + e.spent_amount, 0);
        const catAvailable = catAllocated - catSpent;

        return (
          <Card key={cat.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <div className="flex gap-4 text-sm">
                  <span>Dépensé: <span className="font-semibold text-destructive">{formatBIF(catSpent)}</span></span>
                  <span>Disponible: <span className="font-semibold text-green-600">{formatBIF(catAvailable)}</span></span>
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
                        {usedPct > 90 && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${usedPct > 90 ? 'bg-destructive' : usedPct > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(usedPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm min-w-[100px] text-right">
                          <span className="text-destructive">{formatBIF(env.spent_amount)}</span>
                          {" / "}
                          <span className="text-muted-foreground">{formatBIF(env.allocated_amount)}</span>
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

      {/* Recent Expense Records */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseRecords && expenseRecords.length > 0 ? (
            <DataTable
              data={expenseRecords}
              columns={[
                { key: "date", header: "Date", render: (r) => new Date(r.date).toLocaleDateString("fr-FR"), getValue: (r) => r.date },
                { key: "category", header: "Catégorie", render: (r) => <Badge variant="outline">{r.category}</Badge> },
                { key: "subcategory", header: "Sous-catégorie" },
                { key: "description", header: "Description", render: (r) => r.description || "—" },
                { key: "amount", header: "Montant", render: (r) => <span className="font-semibold text-destructive">{formatBIF(r.amount)}</span>, className: "text-right" },
              ] as DataTableColumn<any>[]}
              pageSize={5}
              searchPlaceholder="Rechercher une dépense..."
              emptyMessage="Aucune dépense enregistrée"
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">Aucune dépense enregistrée</p>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
            <DialogDescription>
              Choisissez la catégorie et vérifiez le solde disponible
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-sm font-medium">Catégorie *</label>
              <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory(""); }}>
                <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>{cat.name} ({cat.totalPercentage}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            {selectedCategory && (
              <div>
                <label className="text-sm font-medium">Sous-catégorie *</label>
                <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                  <SelectTrigger><SelectValue placeholder="Choisir une sous-catégorie" /></SelectTrigger>
                  <SelectContent>
                    {selectedCategoryData?.subcategories.map(sub => {
                      const available = getAvailableAmount(sub.name);
                      return (
                        <SelectItem key={sub.name} value={sub.name}>
                          {sub.name} — Dispo: {available.toLocaleString("fr-FR")} BIF
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Available balance info */}
            {selectedSubcategory && (
              <div className={`p-3 rounded-lg ${isOverBudget ? 'bg-destructive/10 border border-destructive/30' : 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'}`}>
                <p className="text-sm font-medium">
                  Solde disponible pour "{selectedSubcategory}":
                </p>
                <p className={`text-lg font-bold ${isOverBudget ? 'text-destructive' : 'text-green-600'}`}>
                  {formatBIF(availableForSubcategory)}
                </p>
                {isOverBudget && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> Dépassement autorisé : le solde deviendra négatif et sera compensé par les prochains revenus ou un transfert
                  </p>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-sm font-medium">Montant (BIF) *</label>
              <Input
                type="number"
                placeholder="Ex: 50000"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
                min="1"
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
                {isSubmitting ? "Enregistrement..." : "Enregistrer la dépense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EnvelopeTransferDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
