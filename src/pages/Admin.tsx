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
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Shield } from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", role: "viewer" as "admin" | "viewer" });

  // Get current user's company members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["family-members"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.from("profiles").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Check if current user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data || false;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof form) => {
      // Call an edge function to create user (since we can't create users from client)
      const { data, error } = await supabase.functions.invoke("create-family-member", {
        body: {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      setOpen(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", role: "viewer" });
      toast({ title: t.admin.createUser, description: "✓" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const roleLabels: Record<string, string> = {
    admin: t.admin.adminRole,
    viewer: t.admin.viewerRole,
    user: t.admin.memberRole,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.admin.title}</h1>
          <p className="text-muted-foreground">{t.admin.subtitle}</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />{t.admin.createUser}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.admin.createUser}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder={t.auth.email} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder={t.auth.password} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder={t.auth.firstName} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                  <Input placeholder={t.auth.lastName} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as "admin" | "viewer" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t.admin.adminRole}</SelectItem>
                    <SelectItem value="viewer">{t.admin.viewerRole}</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={() => createUserMutation.mutate(form)} disabled={!form.email || !form.password || createUserMutation.isPending}>
                  {t.common.create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />{t.admin.familyMembers}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" />{t.admin.adminRole}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{members.filter(m => m.role === "admin").length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.auth.email}</TableHead>
                <TableHead>{t.admin.role}</TableHead>
                <TableHead>{t.admin.accountCreated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">{t.common.loading}</TableCell></TableRow>
              ) : members.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">{t.common.noData}</TableCell></TableRow>
              ) : members.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.first_name} {member.last_name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell><Badge variant={member.role === "admin" ? "default" : "secondary"}>{roleLabels[member.role || "user"]}</Badge></TableCell>
                  <TableCell>{format(new Date(member.created_at), "dd/MM/yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
