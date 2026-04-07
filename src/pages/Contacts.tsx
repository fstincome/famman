import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Search, Phone, Mail, MapPin, Users, User } from "lucide-react";

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

export default function Contacts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", notes: "",
    avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts-directory"],
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("contacts").select("*").eq("company_id", profile.company_id).order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (contact: typeof form & { id?: string }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single();
      if (!profile?.company_id) throw new Error("No company");

      if (contact.id) {
        const { error } = await supabase.from("contacts").update({
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          address: contact.address || null,
          notes: contact.notes || null,
          avatar_color: contact.avatar_color,
        }).eq("id", contact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert({
          company_id: profile.company_id,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          address: contact.address || null,
          notes: contact.notes || null,
          avatar_color: contact.avatar_color,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-directory"] });
      resetForm();
      toast({ title: t.common.save, description: "✓" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts-directory"] }),
  });

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", address: "", notes: "", avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] });
    setEditId(null);
    setOpen(false);
  };

  const openEdit = (c: any) => {
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "", notes: c.notes || "", avatar_color: c.avatar_color || "#6366f1" });
    setEditId(c.id);
    setOpen(true);
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.contacts?.title || "Annuaire des contacts"}</h1>
          <p className="text-muted-foreground">{t.contacts?.subtitle || "Gérez tous vos contacts familiaux"}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.contacts?.addContact || "Ajouter un contact"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? (t.common.edit) : (t.contacts?.addContact || "Ajouter un contact")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: form.avatar_color }}>
                  {form.name ? form.name[0].toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} className={`w-6 h-6 rounded-full border-2 ${form.avatar_color === c ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, avatar_color: c })} />
                  ))}
                </div>
              </div>
              <Input placeholder={t.common.name + " *"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder={t.contacts?.phone || "Téléphone"} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Input placeholder={t.contacts?.address || "Adresse"} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
              <Button className="w-full" onClick={() => saveMutation.mutate(editId ? { ...form, id: editId } : form)} disabled={!form.name || saveMutation.isPending}>
                {editId ? t.common.update : t.common.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />{t.contacts?.totalContacts || "Total contacts"}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{contacts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4" />{t.contacts?.withEmail || "Avec email"}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{contacts.filter(c => c.email).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" />{t.contacts?.withPhone || "Avec téléphone"}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{contacts.filter(c => c.phone).length}</p></CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-10" placeholder={t.common.search + "..."} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Contacts table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>{t.contacts?.phone || "Téléphone"}</TableHead>
                <TableHead>{t.contacts?.address || "Adresse"}</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">{t.common.loading}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">{t.common.noData}</TableCell></TableRow>
              ) : filtered.map(contact => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: contact.avatar_color || "#6366f1" }}>
                        {contact.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{contact.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : "—"}</TableCell>
                  <TableCell>{contact.phone ? <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a> : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{contact.address || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{contact.notes || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(contact)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(contact.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
