import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseRecord {
  id: string;
  amount: number;
  currency: string;
  category: string;
  subcategory: string;
  description: string | null;
  date: string;
  created_at: string;
}

export function useExpenseRecords() {
  return useQuery({
    queryKey: ["expense-records"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("expense_records")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []) as ExpenseRecord[];
    },
  });
}
