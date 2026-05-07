import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PermContext {
  isAdmin: boolean;
  familyRole: string | null;
  companyId: string | null;
  permissions: Record<string, boolean>; // action_key -> allowed
}

export function usePermissions() {
  return useQuery<PermContext>({
    queryKey: ["permissions-context"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAdmin: false, familyRole: null, companyId: null, permissions: {} };

      const [{ data: isAdminData }, { data: profile }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.from("profiles").select("company_id, family_role").eq("user_id", user.id).single(),
      ]);

      const isAdmin = !!isAdminData;
      const companyId = profile?.company_id ?? null;
      const familyRole = (profile as any)?.family_role ?? null;

      let permissions: Record<string, boolean> = {};
      if (companyId && familyRole && !isAdmin) {
        const { data } = await supabase
          .from("role_permissions" as any)
          .select("action_key, allowed")
          .eq("company_id", companyId)
          .eq("family_role", familyRole);
        for (const row of (data || []) as any[]) {
          permissions[row.action_key] = row.allowed;
        }
      }
      return { isAdmin, familyRole, companyId, permissions };
    },
    staleTime: 60_000,
  });
}

export function useCan(actionKey: string): boolean {
  const { data } = usePermissions();
  if (!data) return false;
  if (data.isAdmin) return true;
  return !!data.permissions[actionKey];
}
