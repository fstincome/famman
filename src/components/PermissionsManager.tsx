import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import {
  PERMISSION_MODULES, FAMILY_ROLES, ALL_ACTION_KEYS, defaultAllowed,
} from "@/lib/permissionsRegistry";

type Matrix = Record<string, Record<string, boolean>>; // role -> action -> allowed

export function PermissionsManager() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [matrix, setMatrix] = useState<Matrix>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState<string>(FAMILY_ROLES[0]);

  const { data: companyId } = useQuery({
    queryKey: ["perm-company"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_company_id");
      return data as string | null;
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["role-permissions", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("role_permissions" as any)
        .select("family_role, action_key, allowed")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!rows) return;
    const m: Matrix = {};
    for (const role of FAMILY_ROLES) {
      m[role] = {};
      for (const key of ALL_ACTION_KEYS) {
        m[role][key] = defaultAllowed(role, key);
      }
    }
    for (const r of rows) {
      if (!m[r.family_role]) m[r.family_role] = {};
      m[r.family_role][r.action_key] = r.allowed;
    }
    setMatrix(m);
    setDirty(false);
  }, [rows]);

  const toggle = (role: string, key: string, value: boolean) => {
    setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [key]: value } }));
    setDirty(true);
  };

  const setModule = (role: string, moduleKey: string, value: boolean) => {
    const mod = PERMISSION_MODULES.find(m => m.key === moduleKey);
    if (!mod) return;
    setMatrix(prev => {
      const next = { ...prev[role] };
      mod.actions.forEach(a => { next[a.key] = value; });
      return { ...prev, [role]: next };
    });
    setDirty(true);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const upserts: any[] = [];
      for (const role of FAMILY_ROLES) {
        for (const key of ALL_ACTION_KEYS) {
          upserts.push({
            company_id: companyId,
            family_role: role,
            action_key: key,
            allowed: !!matrix[role]?.[key],
          });
        }
      }
      const { error } = await supabase
        .from("role_permissions" as any)
        .upsert(upserts, { onConflict: "company_id,family_role,action_key" });
      if (error) throw error;
      toast({ title: language === "fr" ? "Permissions enregistrées" : "Permissions saved" });
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
      qc.invalidateQueries({ queryKey: ["permissions-context"] });
      setDirty(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const familyLabels: Record<string, { fr: string; en: string }> = {
    father: { fr: "Père", en: "Father" }, mother: { fr: "Mère", en: "Mother" },
    son: { fr: "Fils", en: "Son" }, daughter: { fr: "Fille", en: "Daughter" },
    brother: { fr: "Frère", en: "Brother" }, sister: { fr: "Sœur", en: "Sister" },
    uncle: { fr: "Oncle", en: "Uncle" }, aunt: { fr: "Tante", en: "Aunt" },
    grandfather: { fr: "Grand-père", en: "Grandfather" }, grandmother: { fr: "Grand-mère", en: "Grandmother" },
    cousin: { fr: "Cousin", en: "Cousin" }, other: { fr: "Autre", en: "Other" },
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            {language === "fr" ? "Permissions par rôle familial" : "Permissions by family role"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "fr"
              ? "Les administrateurs ont automatiquement accès à tout. Configurez ici ce que chaque rôle familial peut faire."
              : "Admins always have full access. Configure here what each family role can do."}
          </p>
        </div>
        <Button onClick={save} disabled={!dirty || saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {language === "fr" ? "Enregistrer" : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeRole} onValueChange={setActiveRole}>
          <TabsList className="flex-wrap h-auto">
            {FAMILY_ROLES.map(r => (
              <TabsTrigger key={r} value={r}>{familyLabels[r][language as "fr" | "en"]}</TabsTrigger>
            ))}
          </TabsList>
          {FAMILY_ROLES.map(role => (
            <TabsContent key={role} value={role} className="space-y-4 mt-4">
              {PERMISSION_MODULES.map(mod => {
                const allOn = mod.actions.every(a => matrix[role]?.[a.key]);
                const someOn = mod.actions.some(a => matrix[role]?.[a.key]);
                return (
                  <div key={mod.key} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{mod.label[language as "fr" | "en"]}</h4>
                        {allOn ? <Badge variant="default">Tout</Badge> : someOn ? <Badge variant="secondary">Partiel</Badge> : <Badge variant="outline">Aucun</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setModule(role, mod.key, true)}>
                          {language === "fr" ? "Tout activer" : "Enable all"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setModule(role, mod.key, false)}>
                          {language === "fr" ? "Tout désactiver" : "Disable all"}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {mod.actions.map(a => (
                        <div key={a.key} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <span className="text-sm">{a.label[language as "fr" | "en"]}</span>
                          <Switch
                            checked={!!matrix[role]?.[a.key]}
                            onCheckedChange={(v) => toggle(role, a.key, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
