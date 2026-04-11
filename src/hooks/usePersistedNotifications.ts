import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DBNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export function usePersistedNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["db-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as DBNotification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true } as any).eq("id", id as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["db-notifications"] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((n) => !n.read).map((n) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").update({ read: true } as any).in("id", ids as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["db-notifications"] }),
  });

  const clearNotification = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["db-notifications"] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const ids = notifications.map((n) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").delete().in("id", ids as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["db-notifications"] }),
  });

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: (id: string) => markAsRead.mutate(id),
    markAllAsRead: () => markAllAsRead.mutate(),
    clearNotification: (id: string) => clearNotification.mutate(id),
    clearAll: () => clearAll.mutate(),
  };
}
