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
import { Plus, Trash2, Edit2, Landmark, Wallet, CreditCard, PiggyBank, CheckCircle, XCircle } from "lucide-react";

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

  const labels = accountTypeLabels[language] || accountTypeLabels.fr;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const activeAccounts = accounts.filter((a: any) => a.is_active !== false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.bankAccounts?.title || "Comptes bancaires"}</h1>
          <p className="text-muted-foreground">{t.bankAccounts?.subtitle || "Gérez les comptes bancaires de la famille"}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.bankAccounts?.addAccount || "Ajouter un compte"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? t.common.edit : (t.bankAccounts?.addAccount || "Ajouter un compte")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t.bankAccounts?.accountName || "Nom du compte *"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder={t.bankAccounts?.bankName || "Nom de la banque"} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
                <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => <SelectItem key={type} value={type}>{labels[type]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder={t.bankAccounts?.holderName || "Titulaire du compte"} value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder={t.bankAccounts?.accountNumber || "Numéro de compte"} value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
                <Input placeholder="IBAN" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder={t.bankAccounts?.balance || "Solde actuel"} value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
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
                <label htmlFor="is_active" className="text-sm">{t.bankAccounts?.active || "Compte actif"}</label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(editId ? { ...form, id: editId } : form)} disabled={!form.name || saveMutation.isPending}>
                {editId ? t.common.update : t.common.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Landmark className="w-4 h-4" />{t.bankAccounts?.totalBalance || "Solde total"}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalBalance.toLocaleString()} BIF</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />{t.bankAccounts?.activeAccounts || "Comptes actifs"}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeAccounts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="w-4 h-4" />{t.bankAccounts?.totalAccounts || "Total comptes"}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{accounts.length}</p></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.bankAccounts?.accountName || "Nom du compte"}</TableHead>
                <TableHead>{t.bankAccounts?.bankName || "Banque"}</TableHead>
                <TableHead>{t.common.type}</TableHead>
                <TableHead>{t.bankAccounts?.holderName || "Titulaire"}</TableHead>
                <TableHead>{t.bankAccounts?.accountNumber || "N° Compte"}</TableHead>
                <TableHead>{t.bankAccounts?.balance || "Solde"}</TableHead>
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
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />{t.bankAccounts?.active || "Actif"}</Badge>
                      ) : (
                        <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />{t.bankAccounts?.inactive || "Inactif"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
