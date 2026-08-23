import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  name: "Gestion Familiale",
  primary: "#0ea5e9",
  accent: "#10b981",
  dark: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  soft: "#f0f9ff",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  INSERT: "Création",
  UPDATE: "Modification",
  EDIT: "Modification",
  DELETE: "Suppression",
  PURGE: "Purge de données",
  LOGIN: "Connexion",
};

const labelFor = (a: string) => ACTION_LABELS[a.toUpperCase()] ?? a;

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
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Bujumbura",
  });
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- VERSION TEXTE (fallback simple, lisible partout) ----------
function buildText(o: MailOpts): string {
  const L: string[] = [];
  L.push(`${BRAND.name} — Notification administrateur`);
  L.push("------------------------------------------------");
  L.push(`Bonjour ${o.recipientName || "Administrateur"},`);
  L.push("");
  L.push(`Une nouvelle action vient d'etre enregistree.`);
  L.push("");
  L.push(`Action  : ${labelFor(o.action)}`);
  L.push(`Module  : ${o.entityType}`);
  if (o.entityName) L.push(`Element : ${o.entityName}`);
  L.push(`Auteur  : ${o.userName}${o.userEmail ? " <" + o.userEmail + ">" : ""}`);
  L.push(`Date    : ${formatDate()}`);
  if (o.entityId) L.push(`Ref     : ${o.entityId}`);

  if (o.details && Object.keys(o.details).length > 0) {
    L.push("");
    L.push("Details :");
    for (const [k, v] of Object.entries(o.details).slice(0, 20)) {
      if (v === null || v === undefined || v === "") continue;
      L.push(`  - ${k} : ${formatValue(v)}`);
    }
  }

  L.push("");
  L.push("------------------------------------------------");
  L.push("Vous recevez ce message car vous etes administrateur.");
  L.push("Merci de ne pas repondre a cet email automatique.");
  L.push(`${BRAND.name}`);
  // \n simple, pas de \r\n ni trailing spaces -> evite "=20" en quoted-printable
  return L.join("\n");
}

// ---------- VERSION HTML (UN SEUL template unifie, compact) ----------
function buildHtml(o: MailOpts): string {
  const action = labelFor(o.action);
  const date = formatDate();

  const rows: string[] = [];
  const row = (k: string, v: string) =>
    `<tr><td style="padding:10px 14px;background:#f8fafc;color:${BRAND.muted};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;width:35%;border-bottom:1px solid ${BRAND.border};vertical-align:top;">${esc(k)}</td><td style="padding:10px 14px;color:${BRAND.dark};font-size:14px;border-bottom:1px solid ${BRAND.border};">${v}</td></tr>`;

  rows.push(row("Action", `<strong style="color:${BRAND.primary};">${esc(action)}</strong>`));
  rows.push(row("Module", esc(o.entityType)));
  if (o.entityName) rows.push(row("Element concerne", `<strong>${esc(o.entityName)}</strong>`));
  rows.push(row("Auteur", esc(o.userName) + (o.userEmail ? `<br><span style="color:${BRAND.muted};font-size:12px;">${esc(o.userEmail)}</span>` : "")));
  rows.push(row("Date et heure", esc(date)));
  if (o.entityId) rows.push(row("Reference", `<code style="font-size:12px;color:${BRAND.muted};">${esc(o.entityId)}</code>`));

  if (o.details) {
    for (const [k, v] of Object.entries(o.details).slice(0, 15)) {
      if (v === null || v === undefined || v === "") continue;
      rows.push(row(k, esc(formatValue(v))));
    }
  }

  // Pas de retours a la ligne, pas de trailing spaces -> evite les artefacts =20
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${BRAND.name}</title></head><body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${BRAND.dark};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,.08);"><tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:24px 28px;color:#ffffff;"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.9;">${BRAND.name}</div><div style="font-size:20px;font-weight:700;margin-top:6px;">Nouvelle ${esc(action.toLowerCase())} enregistree</div></td></tr><tr><td style="padding:22px 28px 8px;"><p style="margin:0 0 6px;font-size:15px;"><strong>Bonjour ${esc(o.recipientName || "Administrateur")},</strong></p><p style="margin:0 0 16px;color:${BRAND.muted};font-size:14px;line-height:1.6;">Une action vient d'etre realisee dans votre espace famille. Voici les details :</p></td></tr><tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:10px;border-collapse:separate;overflow:hidden;">${rows.join("")}</table></td></tr><tr><td style="padding:20px 28px 8px;"><div style="background:${BRAND.soft};border-left:4px solid ${BRAND.primary};border-radius:8px;padding:12px 14px;font-size:13px;color:${BRAND.dark};line-height:1.5;">Vous recevez cette notification car vous etes <strong>administrateur</strong>. Connectez-vous a l'application pour consulter le journal d'activite complet.</div></td></tr><tr><td style="padding:16px 28px 22px;text-align:center;color:${BRAND.muted};font-size:11px;line-height:1.6;">Notification automatique &mdash; merci de ne pas repondre.<br>&copy; ${new Date().getFullYear()} ${BRAND.name}</td></tr></table></td></tr></table></body></html>`;
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
      .from("profiles")
      .select("company_id, first_name, last_name, email")
      .eq("user_id", caller.id)
      .single();
    if (!callerProfile?.company_id) throw new Error("No company");

    const { action, entity_type, entity_name, entity_id, details } = await req.json();
    if (!action || !entity_type) throw new Error("action and entity_type required");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("company_id", callerProfile.company_id)
      .eq("role", "admin");

    // Destinataire principal : un seul administrateur reçoit les notifications.
    const PRIMARY_ADMIN_EMAIL = "advaxe.mucatcha@gmail.com";
    const allAdmins = (admins || []).filter((a) => a.email);
    const primary = allAdmins.filter(
      (a) => a.email!.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL,
    );
    const adminList = primary.length > 0 ? primary : [];
    if (adminList.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName =
      `${callerProfile.first_name ?? ""} ${callerProfile.last_name ?? ""}`.trim() ||
      callerProfile.email || "Utilisateur";
    const userEmail = callerProfile.email ?? "";
    const subject = `[${BRAND.name}] ${labelFor(action)} — ${entity_type}${entity_name ? " : " + entity_name : ""}`;

    // Log explicite du compte SMTP utilise (utile pour debug expediteur)
    console.log("notify-admins: SMTP user =", gmailUser);

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
        action,
        userName,
        userEmail,
        entityType: entity_type,
        entityName: entity_name,
        entityId: entity_id,
        details,
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

    return new Response(
      JSON.stringify({ success: true, sent: adminList.length, from: gmailUser }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("notify-admins error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
