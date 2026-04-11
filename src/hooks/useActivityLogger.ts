import { supabase } from "@/integrations/supabase/client";

export interface ActivityEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, any>;
}

export async function logActivity(entry: ActivityEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.company_id) return;

    await supabase.from("activity_log").insert({
      user_id: user.id,
      company_id: profile.company_id,
      user_name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user.email || "Utilisateur",
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_name: entry.entity_name || null,
      details: entry.details || null,
    } as any);
  } catch (e) {
    console.error("Activity log error:", e);
  }
}

export async function logAndNotify(
  activity: ActivityEntry,
  notification: { title: string; message: string; type: "success" | "info" | "warning" | "error" }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.company_id) return;

    const userName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user.email || "Utilisateur";

    // Insert both in parallel
    await Promise.all([
      supabase.from("activity_log").insert({
        user_id: user.id,
        company_id: profile.company_id,
        user_name: userName,
        action: activity.action,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id || null,
        entity_name: activity.entity_name || null,
        details: activity.details || null,
      } as any),
      supabase.from("notifications").insert({
        user_id: user.id,
        company_id: profile.company_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
      } as any),
    ]);
  } catch (e) {
    console.error("Log & notify error:", e);
  }
}
