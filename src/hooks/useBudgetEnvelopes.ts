import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SUBCATEGORIES } from "@/lib/budgetConfig";

export interface BudgetEnvelope {
  id: string;
  company_id: string;
  category: string;
  subcategory: string;
  percentage: number;
  allocated_amount: number;
  spent_amount: number;
  currency: string;
}

export function useBudgetEnvelopes() {
  const queryClient = useQueryClient();

  const { data: envelopes, isLoading } = useQuery({
    queryKey: ["budget-envelopes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) return [];

      // Fetch existing envelopes
      const { data, error } = await supabase
        .from("budget_envelopes")
        .select("*")
        .eq("company_id", profile.company_id);

      if (error) throw error;

      // If no envelopes exist, initialize them
      if (!data || data.length === 0) {
        const newEnvelopes = ALL_SUBCATEGORIES.map(sub => ({
          company_id: profile.company_id!,
          category: sub.category,
          subcategory: sub.subcategory,
          percentage: sub.percentage,
          allocated_amount: 0,
          spent_amount: 0,
          currency: "BIF",
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("budget_envelopes")
          .insert(newEnvelopes)
          .select();

        if (insertError) throw insertError;
        return (inserted || []) as BudgetEnvelope[];
      }

      return (data || []) as BudgetEnvelope[];
    },
  });

  const getAvailableAmount = (subcategory: string): number => {
    const envelope = envelopes?.find(e => e.subcategory === subcategory);
    if (!envelope) return 0;
    return envelope.allocated_amount - envelope.spent_amount;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["budget-envelopes"] });
  };

  return { envelopes: envelopes || [], isLoading, getAvailableAmount, invalidate };
}
