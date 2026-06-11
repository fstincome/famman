import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  name: "Gestion Familiale",
  primary: "#0ea5e9",   // bleu ciel
  accent: "#10b981",    // vert émeraude
  dark: "#0f172a",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  soft: "#f0f9ff",
};

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CREATE:  { label: "Création",     color: "#065f46", bg: "#d1fae5", icon: "✅" },
  INSERT:  { label: "Création",     color: "#065f46", bg: "#d1fae5", icon: "✅" },
  UPDATE:  { label: "Modification", color: "#075985", bg: "#e0f2fe", icon: "✏️" },
  EDIT:    { label: "Modification", color: "#075985", bg: "#e0f2fe", icon: "✏️" },
  DELETE:  { label: "Suppression",  color: "#991b1b", bg: "#fee2e2", icon: "🗑️" },
  PURGE:   { label: "Purge",        color: "#991b1b", bg: "#fee2e2", icon: "⚠️" },
  LOGIN:   { label: "Connexion",    color: "#1e3a8a", bg: "#dbeafe", icon: "🔐" },
};

const metaFor = (action: string) =>
  ACTION_META[action.toUpperCase()] ?? { label: action, color: "#0c4a6e", bg: "#e0f2fe", icon: "📌" };

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- VERSION TEXTE BRUT ---
function buildText(opts: MailOpts): string {
  const m = metaFor(opts.action);
  const lines: string[] = [];
  lines.push(`${BRAND.name} — Notification administrateur`);
  lines.push("================================================");
  lines.push("");
  lines.push(`Bonjour ${opts.recipientName || "Administrateur"},`);
  lines.push("");
  lines.push(`Une action vient d'être enregistrée dans votre espace famille.`);
  lines.push("");
  lines.push(`Action       : ${m.label}`);
  lines.push(`Module       : ${opts.entityType}`);
  if (opts.entityName) lines.push(`Élément      : ${opts.entityName}`);
  lines.push(`Auteur       : ${opts.userName}`);
  if (opts.userEmail) lines.push(`Email auteur : ${opts.userEmail}`);
  lines.push(`Date         : ${formatDate()}`);
  if (opts.entityId) lines.push(`Référence    : ${opts.entityId}`);

  if (opts.details && Object.keys(opts.details).length > 0) {
    lines.push("");
    lines.push("Détails :");
    for (const [k, v] of Object.entries(opts.details).slice(0, 20)) {
      if (v === null || v === undefined || v === "") continue;
      lines.push(`  - ${k} : ${formatValue(v)}`);
    }
  }

  lines.push("");
  lines.push("------------------------------------------------");
  lines.push("Vous recevez ce message car vous êtes administrateur.");
  lines.push("Notification automatique — merci de ne pas répondre.");
  lines.push(`— ${BRAND.name}`);
  return lines.join("\r\n");
}

// --- VERSION HTML compacte (sans trailing spaces ni longues lignes WS) ---
function buildHtml(opts: MailOpts): string {
  const m = metaFor(opts.action);
  const date = formatDate();

  const row = (label: string, value: string) =>
    `<tr><td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:600;width:40%;vertical-align:top;background:#f8fafc;">${escapeHtml(label)}</td><td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">${value}</td></tr>`;

  const detailRows = opts.details
    ? Object.entries(opts.details)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .slice(0, 20)
        .map(([k, v]) => row(k, escapeHtml(formatValue(v))))
        .join("")
    : "";

  const parts: string[] = [];
  parts.push(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${BRAND.name}</title></head>`);
  parts.push(`<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${BRAND.text};">`);
  parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px;"><tr><td align="center">`);
  parts.push(`<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08);">`);

  // Header
  parts.push(`<tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:28px 28px;color:#ffffff;">`);
  parts.push(`<div style="font-size:13px;opacity:.9;letter-spacing:1px;text-transform:uppercase;">${BRAND.name}</div>`);
  parts.push(`<div style="font-size:22px;font-weight:700;margin-top:6px;">${m.icon} Nouvelle ${escapeHtml(m.label.toLowerCase())}</div>`);
  parts.push(`<div style="font-size:13px;opacity:.95;margin-top:4px;">Module : <strong>${escapeHtml(opts.entityType)}</strong>${opts.entityName ? ` — ${escapeHtml(opts.entityName)}` : ""}</div>`);
  parts.push(`</td></tr>`);

  // Greeting
  parts.push(`<tr><td style="padding:24px 28px 8px;">`);
  parts.push(`<p style="margin:0 0 8px;font-size:15px;"><strong>Bonjour ${escapeHtml(opts.recipientName || "Administrateur")},</strong></p>`);
  parts.push(`<p style="margin:0 0 16px;color:${BRAND.muted};font-size:14px;line-height:1.6;">Une action vient d'être enregistrée dans votre espace famille. Voici les informations détaillées :</p>`);
  parts.push(`</td></tr>`);

  // Info table
  parts.push(`<tr><td style="padding:0 28px 4px;">`);
  parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;border-collapse:separate;">`);
  parts.push(row("Action", `<span style="display:inline-block;background:${m.bg};color:${m.color};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;">${m.icon} ${escapeHtml(m.label)}</span>`));
  parts.push(row("Module", escapeHtml(opts.entityType)));
  if (opts.entityName) parts.push(row("Élément concerné", `<strong>${escapeHtml(opts.entityName)}</strong>`));
  parts.push(row("Auteur", `${escapeHtml(opts.userName)}${opts.userEmail ? `<br><span style="color:${BRAND.muted};font-size:12px;">${escapeHtml(opts.userEmail)}</span>` : ""}`));
  parts.push(row("Date", escapeHtml(date)));
  if (opts.entityId) parts.push(row("Référence", `<code style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${BRAND.muted};">${escapeHtml(opts.entityId)}</code>`));
  parts.push(`</table>`);
  parts.push(`</td></tr>`);

  // Details
  if (detailRows) {
    parts.push(`<tr><td style="padding:20px 28px 4px;">`);
    parts.push(`<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${BRAND.accent};margin-bottom:10px;">Détails de l'opération</div>`);
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;border-collapse:separate;">${detailRows}</table>`);
    parts.push(`</td></tr>`);
  }

  // Info banner
  parts.push(`<tr><td style="padding:20px 28px 8px;">`);
  parts.push(`<div style="background:${BRAND.soft};border-left:4px solid ${BRAND.primary};border-radius:8px;padding:12px 14px;font-size:13px;color:${BRAND.dark};line-height:1.5;">Vous recevez cette notification car vous êtes <strong>administrateur</strong> de l'espace famille. Connectez-vous à l'application pour consulter le journal d'activité complet.</div>`);
  parts.push(`</td></tr>`);

  // Footer
  parts.push(`<tr><td style="padding:18px 28px 24px;">`);
  parts.push(`<p style="margin:0;color:${BRAND.muted};font-size:11px;line-height:1.6;text-align:center;">Notification automatique — merci de ne pas répondre à ce message.<br>© ${new Date().getFullYear()} ${BRAND.name}</p>`);
  parts.push(`</td></tr>`);

  parts.push(`</table></td></tr></table></body></html>`);

  // Important: pas de retours à la ligne ni espaces de fin (évite "=20" en quoted-printable)
  return parts.join("");
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
        content: buildText(opts),
        html: buildHtml(opts),
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
