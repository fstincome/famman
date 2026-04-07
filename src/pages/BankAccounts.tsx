import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Landmark, Wallet, CreditCard, PiggyBank, CheckCircle, XCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";

const ACCOUNT_TYPES = ["checking", "savings", "business", "mobile_money", "other"] as const;

const accountTypeLabels: Record<string, Record<string, string>> = {
  fr: { checking: "Compte courant", savings: "Compte épargne", business: "Compte professionnel", mobile_money: "Mobile Money", other: "Autre" },
  en: { checking: "Checking", savings: "Savings", business: "Business", mobile_money: "Mobile Money", other: "Other" },
};

const accountTypeIcons: Record<string, any> = {
  checking: Wallet,
  savings: PiggyBank,
  business: Landmark,
  mobile_money: CreditCard,
  other: Wallet,
};

export default function BankAccounts() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", bank_name: "", account_number: "", iban: "", account_type: "checking",
    holder_name: "", balance: "", currency: "BIF", notes: "", is_active: true,
  });

  // Transaction dialog state
  const [txOpen, setTxOpen] = useState(false);
  const [txAccount, setTxAccount] = useState<any>(null);
  const [txForm, setTxForm] = useState({ type: "deposit" as "deposit" | "withdrawal", amount: "", description: "" });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["family-bank-accounts"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("accounts").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (acc: typeof form & { id?: string }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");

      const payload: any = {
        name: acc.name,
        bank_name: acc.bank_name || null,
        account_number: acc.account_number || null,
        iban: acc.iban || null,
        account_type: acc.account_type,
        holder_name: acc.holder_name || null,
        balance: parseFloat(acc.balance) || 0,
        currency: acc.currency,
        notes: acc.notes || null,
        is_active: acc.is_active,
      };

      if (acc.id) {
        const { error } = await supabase.from("accounts").update(payload).eq("id", acc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert({ ...payload, company_id: profile.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-bank-accounts"] });
      resetForm();
      toast({ title: t.common.save, description: "✓" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family-bank-accounts"] }),
  });

  // Transaction mutation — updates the balance
  const txMutation = useMutation({
    mutationFn: async ({ accountId, currentBalance, type, amount, description }: {
      accountId: string; currentBalance: number; type: "deposit" | "withdrawal"; amount: number; description: string;
    }) => {
      const newBalance = type === "deposit" ? currentBalance + amount : currentBalance - amount;
      if (type === "withdrawal" && newBalance < 0) {
        throw new Error("Solde insuffisant");
      }
      const { error } = await supabase.from("accounts").update({ balance: newBalance }).eq("id", accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-bank-accounts"] });
      setTxOpen(false);
      setTxAccount(null);
      setTxForm({ type: "deposit", amount: "", description: "" });
      toast({ title: t.common.save, description: "✓" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", bank_name: "", account_number: "", iban: "", account_type: "checking", holder_name: "", balance: "", currency: "BIF", notes: "", is_active: true });
    setEditId(null);
    setOpen(false);
  };

  const openEdit = (a: any) => {
    setForm({
      name: a.name, bank_name: a.bank_name || "", account_number: a.account_number || "",
      iban: a.iban || "", account_type: a.account_type || "checking", holder_name: a.holder_name || "",
      balance: String(a.balance || 0), currency: a.currency || "BIF", notes: a.notes || "", is_active: a.is_active ?? true,
    });
    setEditId(a.id);
    setOpen(true);
  };

  const openTransaction = (acc: any) => {
    setTxAccount(acc);
    setTxForm({ type: "deposit", amount: "", description: "" });
    setTxOpen(true);
  };

  const labels = accountTypeLabels[language] || accountTypeLabels.fr;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const activeAccounts = accounts.filter((a: any) => a.is_active !== false);

  const txLabels = language === "fr"
    ? { deposit: "Versement", withdrawal: "Retrait", title: "Opération bancaire", amountLabel: "Montant", descLabel: "Motif / Description", confirm: "Confirmer l'opération", currentBalance: "Solde actuel", newBalance: "Nouveau solde" }
    : { deposit: "Deposit", withdrawal: "Withdrawal", title: "Bank Operation", amountLabel: "Amount", descLabel: "Reason / Description", confirm: "Confirm operation", currentBalance: "Current balance", newBalance: "New balance" };

  const txAmount = parseFloat(txForm.amount) || 0;
  const txNewBalance = txAccount ? (txForm.type === "deposit" ? Number(txAccount.balance) + txAmount : Number(txAccount.balance) - txAmount) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.bankAccounts.title}</h1>
          <p className="text-muted-foreground">{t.bankAccounts.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.bankAccounts.addAccount}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? t.common.edit : t.bankAccounts.addAccount}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t.bankAccounts.accountName + " *"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder={t.bankAccounts.bankName} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
                <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => <SelectItem key={type} value={type}>{labels[type]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder={t.bankAccounts.holderName} value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder={t.bankAccounts.accountNumber} value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
                <Input placeholder="IBAN" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder={t.bankAccounts.balance} value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIF">BIF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} id="is_active" className="rounded" />
                <label htmlFor="is_active" className="text-sm">{t.bankAccounts.active}</label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(editId ? { ...form, id: editId } : form)} disabled={!form.name || saveMutation.isPending}>
                {editId ? t.common.update : t.common.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={txOpen} onOpenChange={(v) => { if (!v) { setTxOpen(false); setTxAccount(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{txLabels.title}</DialogTitle></DialogHeader>
          {txAccount && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">{txAccount.name} — {txAccount.bank_name || ""}</p>
                <p className="text-lg font-bold">{txLabels.currentBalance}: {Number(txAccount.balance).toLocaleString()} {txAccount.currency}</p>
              </div>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={txForm.type === "deposit" ? "default" : "outline"}
                  className={txForm.type === "deposit" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                  onClick={() => setTxForm({ ...txForm, type: "deposit" })}
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  {txLabels.deposit}
                </Button>
                <Button
                  variant={txForm.type === "withdrawal" ? "default" : "outline"}
                  className={txForm.type === "withdrawal" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                  onClick={() => setTxForm({ ...txForm, type: "withdrawal" })}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  {txLabels.withdrawal}
                </Button>
              </div>

              <Input
                type="number"
                placeholder={txLabels.amountLabel}
                value={txForm.amount}
                onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                min="0"
              />
              <Input
                placeholder={txLabels.descLabel}
                value={txForm.description}
                onChange={e => setTxForm({ ...txForm, description: e.target.value })}
              />

              {/* Preview new balance */}
              {txAmount > 0 && (
                <div className={`p-3 rounded-lg border-2 ${txForm.type === "deposit" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"}`}>
                  <p className="text-sm text-muted-foreground">{txLabels.newBalance}:</p>
                  <p className={`text-xl font-bold ${txNewBalance < 0 ? "text-destructive" : ""}`}>
                    {txNewBalance.toLocaleString()} {txAccount.currency}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                disabled={txAmount <= 0 || txMutation.isPending || (txForm.type === "withdrawal" && txNewBalance < 0)}
                onClick={() => txMutation.mutate({
                  accountId: txAccount.id,
                  currentBalance: Number(txAccount.balance),
                  type: txForm.type,
                  amount: txAmount,
                  description: txForm.description,
                })}
              >
                {txLabels.confirm}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Landmark className="w-4 h-4" />{t.bankAccounts.totalBalance}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalBalance.toLocaleString()} BIF</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4" />{t.bankAccounts.activeAccounts}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeAccounts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="w-4 h-4" />{t.bankAccounts.totalAccounts}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{accounts.length}</p></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.bankAccounts.accountName}</TableHead>
                <TableHead>{t.bankAccounts.bankName}</TableHead>
                <TableHead>{t.common.type}</TableHead>
                <TableHead>{t.bankAccounts.holderName}</TableHead>
                <TableHead>{t.bankAccounts.accountNumber}</TableHead>
                <TableHead>{t.bankAccounts.balance}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">{t.common.loading}</TableCell></TableRow>
              ) : accounts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">{t.common.noData}</TableCell></TableRow>
              ) : accounts.map((acc: any) => {
                const Icon = accountTypeIcons[acc.account_type] || Wallet;
                return (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {acc.name}
                      </div>
                    </TableCell>
                    <TableCell>{acc.bank_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{labels[acc.account_type] || acc.account_type}</Badge></TableCell>
                    <TableCell>{acc.holder_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{acc.account_number ? `•••${acc.account_number.slice(-4)}` : "—"}</TableCell>
                    <TableCell className="font-medium">{Number(acc.balance).toLocaleString()} {acc.currency}</TableCell>
                    <TableCell>
                      {acc.is_active !== false ? (
                        <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />{t.bankAccounts.active}</Badge>
                      ) : (
                        <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />{t.bankAccounts.inactive}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openTransaction(acc)} title={txLabels.title}>
                          <ArrowDownCircle className="w-4 h-4 mr-1" />
                          <ArrowUpCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(acc)}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(acc.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
