import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Shield, ShieldCheck, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PermissionsManager } from "@/components/PermissionsManager";

const FAMILY_ROLES = [
  "father", "mother", "son", "daughter", "brother", "sister",
  "uncle", "aunt", "grandfather", "grandmother", "cousin", "other",
] as const;

export default function Admin() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "",
    role: "viewer" as "admin" | "viewer",
    familyRole: "son" as string,
  });

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
      const { data, error } = await supabase.functions.invoke("create-family-member", {
        body: {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          familyRole: userData.familyRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      setOpen(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", role: "viewer", familyRole: "son" });
      toast({ title: t.admin.createUser, description: "✓" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("update-member-password", {
        body: { userId, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setPwOpen(false);
      setNewPassword("");
      setPwTarget(null);
      toast({ title: "Mot de passe mis à jour", description: "✓" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const familyRoleLabels: Record<string, string> = {
    father: t.admin.father, mother: t.admin.mother,
    son: t.admin.son, daughter: t.admin.daughter,
    brother: t.admin.brother, sister: t.admin.sister,
    uncle: t.admin.uncle, aunt: t.admin.aunt,
    grandfather: t.admin.grandfather, grandmother: t.admin.grandmother,
    cousin: t.admin.cousin, other: t.admin.otherMember, member: t.admin.memberRole,
  };

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
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>{t.auth.firstName}</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div><Label>{t.auth.lastName}</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
                </div>
                <div><Label>{t.admin.familyRole}</Label>
                  <Select value={form.familyRole} onValueChange={v => setForm({ ...form, familyRole: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FAMILY_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{familyRoleLabels[r] || r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t.auth.email}</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>{t.auth.password}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                <div><Label>{t.admin.permission}</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as "admin" | "viewer" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t.admin.adminRole}</SelectItem>
                      <SelectItem value="viewer">{t.admin.viewerRole}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => createUserMutation.mutate(form)} disabled={!form.email || !form.password || !form.firstName || createUserMutation.isPending}>
                  {t.common.create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />{t.admin.familyMembers}</TabsTrigger>
          {isAdmin && <TabsTrigger value="permissions"><ShieldCheck className="w-4 h-4 mr-2" />Permissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-4">
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
                    <TableHead>{t.admin.familyRole}</TableHead>
                    <TableHead>{t.auth.email}</TableHead>
                    <TableHead>{t.admin.permission}</TableHead>
                    <TableHead>{t.admin.accountCreated}</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8">{t.common.loading}</TableCell></TableRow>
                  ) : members.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8">{t.common.noData}</TableCell></TableRow>
                  ) : members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.first_name} {member.last_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {familyRoleLabels[member.family_role || "member"] || member.family_role || t.admin.memberRole}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell><Badge variant={member.role === "admin" ? "default" : "secondary"}>{roleLabels[member.role || "user"]}</Badge></TableCell>
                      <TableCell>{format(new Date(member.created_at), "dd/MM/yyyy")}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPwTarget({ id: member.user_id, name: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.email });
                              setNewPassword("");
                              setPwOpen(true);
                            }}
                          >
                            <KeyRound className="w-4 h-4 mr-1" />Mot de passe
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="permissions" className="mt-4">
            <PermissionsManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
