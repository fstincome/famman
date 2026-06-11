import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  name: "Gestion Familiale",
  primary: "#4f46e5",
  accent: "#7c3aed",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
};

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CREATE:  { label: "Création",     color: "#065f46", bg: "#d1fae5", icon: "✨" },
  INSERT:  { label: "Création",     color: "#065f46", bg: "#d1fae5", icon: "✨" },
  UPDATE:  { label: "Modification", color: "#92400e", bg: "#fef3c7", icon: "✏️" },
  EDIT:    { label: "Modification", color: "#92400e", bg: "#fef3c7", icon: "✏️" },
  DELETE:  { label: "Suppression",  color: "#991b1b", bg: "#fee2e2", icon: "🗑️" },
  PURGE:   { label: "Purge",        color: "#991b1b", bg: "#fee2e2", icon: "⚠️" },
  LOGIN:   { label: "Connexion",    color: "#1e40af", bg: "#dbeafe", icon: "🔐" },
};

const metaFor = (action: string) =>
  ACTION_META[action.toUpperCase()] ?? { label: action, color: "#1e3a8a", bg: "#dbeafe", icon: "📌" };

interface MailOpts {
  action: string;
  userName: string;
  userEmail: string;
  entityType: string;
  entityName?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  recipientName?: string;
}

function formatDate() {
  return new Date().toLocaleString("fr-FR", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Bujumbura",
  });
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// --- VERSION TEXTE BRUT (lisible partout, pas de HTML visible) ---
function buildText(opts: MailOpts): string {
  const m = metaFor(opts.action);
  const lines: string[] = [];
  lines.push(`=== ${BRAND.name.toUpperCase()} — Notification ===`);
  lines.push("");
  lines.push(`Bonjour ${opts.recipientName || "Administrateur"},`);
  lines.push("");
  lines.push(`Une nouvelle action vient d'être enregistrée dans votre espace famille.`);
  lines.push("");
  lines.push(`-------------------------------------------`);
  lines.push(`Action       : ${m.label}`);
  lines.push(`Module       : ${opts.entityType}`);
  if (opts.entityName) lines.push(`Élément      : ${opts.entityName}`);
  lines.push(`Auteur       : ${opts.userName}`);
  if (opts.userEmail) lines.push(`Email auteur : ${opts.userEmail}`);
  lines.push(`Date         : ${formatDate()}`);
  if (opts.entityId) lines.push(`Référence    : ${opts.entityId}`);
  lines.push(`-------------------------------------------`);

  if (opts.details && Object.keys(opts.details).length > 0) {
    lines.push("");
    lines.push("Détails :");
    for (const [k, v] of Object.entries(opts.details).slice(0, 15)) {
      if (v === null || v === undefined || v === "") continue;
      lines.push(`  • ${k} : ${formatValue(v)}`);
    }
  }

  lines.push("");
  lines.push("Vous recevez ce message car vous êtes administrateur.");
  lines.push("Ceci est une notification automatique — merci de ne pas répondre.");
  lines.push("");
  lines.push(`— ${BRAND.name}`);
  return lines.join("\n");
}

// --- VERSION HTML (rendu propre dans Gmail) ---
function buildHtml(opts: MailOpts): string {
  const m = metaFor(opts.action);
  const date = formatDate();

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;width:38%;vertical-align:top;">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">${value}</td>
    </tr>`;

  const detailRows = opts.details
    ? Object.entries(opts.details)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .slice(0, 15)
        .map(([k, v]) => row(k, formatValue(v)))
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${BRAND.text};">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;background:#f3f4f6;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06);">
  <tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:28px;text-align:center;color:#fff;">
    <div style="font-size:22px;font-weight:800;letter-spacing:.5px;">${BRAND.name}</div>
    <div style="font-size:12px;opacity:.9;margin-top:4px;">Notification automatique</div>
  </td></tr>
  <tr><td style="padding:26px 28px 8px;">
    <p style="margin:0 0 8px;font-size:16px;"><strong>Bonjour ${opts.recipientName || "Administrateur"},</strong></p>
    <p style="margin:0 0 18px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Une nouvelle action vient d'être enregistrée dans votre espace famille.
    </p>
    <div style="display:inline-block;background:${m.bg};color:${m.color};padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:14px;">
      ${m.icon} ${m.label} — ${opts.entityType}
    </div>
  </td></tr>
  <tr><td style="padding:0 28px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden;">
      ${row("Action", m.label)}
      ${row("Module", opts.entityType)}
      ${opts.entityName ? row("Élément concerné", opts.entityName) : ""}
      ${row("Auteur", `${opts.userName}${opts.userEmail ? `<br><span style="color:${BRAND.muted};font-size:12px;">${opts.userEmail}</span>` : ""}`)}
      ${row("Date", date)}
      ${opts.entityId ? row("Référence", `<span style="font-family:monospace;font-size:12px;">${opts.entityId}</span>`) : ""}
    </table>
  </td></tr>
  ${detailRows ? `
  <tr><td style="padding:18px 28px 8px;">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Détails</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden;background:#fafafa;">
      ${detailRows}
    </table>
  </td></tr>` : ""}
  <tr><td style="padding:18px 28px 26px;">
    <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      Vous recevez ce message car vous êtes administrateur de l'espace famille.<br>
      Ceci est une notification automatique — merci de ne pas répondre.
    </p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:14px;text-align:center;border-top:1px solid ${BRAND.border};font-size:11px;color:${BRAND.muted};">
    © ${new Date().getFullYear()} ${BRAND.name}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("company_id", callerProfile.company_id)
      .eq("role", "admin");

    const adminList = (admins || []).filter(a => a.email);
    if (adminList.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = `${callerProfile.first_name ?? ""} ${callerProfile.last_name ?? ""}`.trim()
      || callerProfile.email || "Utilisateur";
    const userEmail = callerProfile.email ?? "";
    const m = metaFor(action);
    const subject = `[${BRAND.name}] ${m.icon} ${m.label} — ${entity_type}${entity_name ? ` : ${entity_name}` : ""}`;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    });

    for (const admin of adminList) {
      const recipientName = `${admin.first_name ?? ""} ${admin.last_name ?? ""}`.trim() || undefined;
      const opts: MailOpts = {
        action, userName, userEmail,
        entityType: entity_type, entityName: entity_name, entityId: entity_id, details,
        recipientName,
      };
      await client.send({
        from: `${BRAND.name} <${gmailUser}>`,
        to: admin.email!,
        subject,
        content: buildText(opts), // texte brut lisible (fallback)
        html: buildHtml(opts),    // version HTML rendue
      });
    }
    await client.close();

    return new Response(JSON.stringify({ success: true, sent: adminList.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-admins error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
