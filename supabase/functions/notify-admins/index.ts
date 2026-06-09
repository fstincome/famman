import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER")!;
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD")!.replace(/\s+/g, "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: callerProfile } = await callerClient
      .from("profiles").select("company_id, first_name, last_name, email").eq("user_id", caller.id).single();
    if (!callerProfile?.company_id) throw new Error("No company");

    const { action, entity_type, entity_name, entity_id, details } = await req.json();
    if (!action || !entity_type) throw new Error("action and entity_type required");

    // Fetch admin emails in same company
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("company_id", callerProfile.company_id)
      .eq("role", "admin");

    const recipients = (admins || []).map(a => a.email).filter(Boolean) as string[];
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = `${callerProfile.first_name ?? ""} ${callerProfile.last_name ?? ""}`.trim() || callerProfile.email || "Utilisateur";
    const subject = `[Gestion Familiale] ${action} — ${entity_type}${entity_name ? ` : ${entity_name}` : ""}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e40af">Nouvelle activité</h2>
        <p><strong>${userName}</strong> a effectué l'action <strong>${action}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin-top:12px">
          <tr><td style="padding:6px;border:1px solid #e5e7eb"><b>Type</b></td><td style="padding:6px;border:1px solid #e5e7eb">${entity_type}</td></tr>
          ${entity_name ? `<tr><td style="padding:6px;border:1px solid #e5e7eb"><b>Élément</b></td><td style="padding:6px;border:1px solid #e5e7eb">${entity_name}</td></tr>` : ""}
          ${entity_id ? `<tr><td style="padding:6px;border:1px solid #e5e7eb"><b>ID</b></td><td style="padding:6px;border:1px solid #e5e7eb">${entity_id}</td></tr>` : ""}
          <tr><td style="padding:6px;border:1px solid #e5e7eb"><b>Date</b></td><td style="padding:6px;border:1px solid #e5e7eb">${new Date().toLocaleString("fr-FR")}</td></tr>
        </table>
        ${details ? `<pre style="background:#f3f4f6;padding:10px;margin-top:12px;border-radius:6px;font-size:12px;overflow:auto">${JSON.stringify(details, null, 2)}</pre>` : ""}
        <p style="color:#6b7280;font-size:12px;margin-top:16px">Notification automatique — Gestion Familiale</p>
      </div>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    });

    await client.send({
      from: `Gestion Familiale <${gmailUser}>`,
      to: recipients,
      subject,
      html,
      content: `${userName} a effectué ${action} sur ${entity_type}${entity_name ? ` (${entity_name})` : ""}.`,
    });
    await client.close();

    return new Response(JSON.stringify({ success: true, sent: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-admins error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
