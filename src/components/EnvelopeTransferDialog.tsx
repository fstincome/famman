import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useBudgetEnvelopes, BudgetEnvelope } from "@/hooks/useBudgetEnvelopes";
import { logAndNotify } from "@/hooks/useActivityLogger";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} BIF`;

export function EnvelopeTransferDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { envelopes, invalidate } = useBudgetEnvelopes();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fromEnv = envelopes.find(e => e.id === fromId);
  const toEnv = envelopes.find(e => e.id === toId);
  const available = fromEnv ? fromEnv.allocated_amount - fromEnv.spent_amount : 0;
  const amt = parseFloat(amount) || 0;
  const over = amt > available;

  const reset = () => { setFromId(""); setToId(""); setAmount(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromEnv || !toEnv) return toast.error("Sélectionnez source et destination");
    if (fromEnv.id === toEnv.id) return toast.error("Source et destination doivent être différentes");
    if (amt <= 0) return toast.error("Montant invalide");
    if (over) return toast.error(`Fonds insuffisants. Disponible: ${fmt(available)}`);

    setSubmitting(true);
    try {
      const { error: e1 } = await supabase
        .from("budget_envelopes")
        .update({ allocated_amount: fromEnv.allocated_amount - amt, updated_at: new Date().toISOString() })
        .eq("id", fromEnv.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("budget_envelopes")
        .update({ allocated_amount: toEnv.allocated_amount + amt, updated_at: new Date().toISOString() })
        .eq("id", toEnv.id);
      if (e2) throw e2;

      toast.success(`${fmt(amt)} transféré : ${fromEnv.subcategory} → ${toEnv.subcategory}`);
      logAndNotify(
        { action: "update", entity_type: "budget_envelope", entity_name: `${fromEnv.subcategory} → ${toEnv.subcategory}`, details: { amount: amt, from: fromEnv.subcategory, to: toEnv.subcategory } },
        { title: "🔄 Transfert d'enveloppe", message: `${fmt(amt)} : ${fromEnv.subcategory} → ${toEnv.subcategory}`, type: "info" }
      );
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["budget-envelopes"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du transfert");
    } finally {
      setSubmitting(false);
    }
  };

  const renderOption = (env: BudgetEnvelope) => {
    const av = env.allocated_amount - env.spent_amount;
    return `${env.subcategory} (${env.category}) — Dispo: ${av.toLocaleString("fr-FR")} BIF`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Transférer entre enveloppes</DialogTitle>
          <DialogDescription>Déplacer du budget d'une sous-catégorie vers une autre.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Source (depuis) *</label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Choisir la sous-catégorie source" /></SelectTrigger>
              <SelectContent>
                {envelopes.map(env => (
                  <SelectItem key={env.id} value={env.id}>{renderOption(env)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Destination (vers) *</label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Choisir la sous-catégorie destination" /></SelectTrigger>
              <SelectContent>
                {envelopes.filter(e => e.id !== fromId).map(env => (
                  <SelectItem key={env.id} value={env.id}>{renderOption(env)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fromEnv && (
            <div className={`p-3 rounded-lg ${over ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'}`}>
              <p className="text-sm">Disponible dans <strong>{fromEnv.subcategory}</strong> :</p>
              <p className={`text-lg font-bold ${over ? 'text-destructive' : 'text-green-600'}`}>{fmt(available)}</p>
              {over && <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Montant supérieur au disponible</p>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Montant à transférer (BIF) *</label>
            <Input type="number" min="1" placeholder="Ex: 10000" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
            <Button type="submit" disabled={submitting || over || !fromId || !toId}>
              {submitting ? "Transfert..." : "Transférer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
