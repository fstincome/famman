import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand palette — Gestion Familiale
const BRAND = {
  name: "Gestion Familiale",
  tagline: "Plateforme de gestion patrimoniale & familiale",
  primary: "#4f46e5",       // indigo
  primaryDark: "#3730a3",
  accent: "#7c3aed",        // violet
  bg: "#f3f4f6",
  card: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
};

// Action → couleur + libellé + icône
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

function buildHtml(opts: {
  action: string;
  userName: string;
  userEmail: string;
  entityType: string;
  entityName?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  recipientName?: string;
}) {
  const m = metaFor(opts.action);
  const date = new Date().toLocaleString("fr-FR", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Bujumbura",
  });

  const detailRows = opts.details
    ? Object.entries(opts.details)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .slice(0, 12)
        .map(([k, v]) => `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;width:38%;">${k}</td>
            <td style="padding:10px 14px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">${
              typeof v === "object" ? JSON.stringify(v) : String(v)
            }</td>
          </tr>`).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.card};border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.accent} 100%);padding:36px 32px;text-align:center;">
          <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:1px;">${BRAND.name.toUpperCase()}</div>
          <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:6px;letter-spacing:.5px;text-transform:uppercase;">${BRAND.tagline}</div>
        </td></tr>

        <!-- ACTION BADGE -->
        <tr><td style="background:${BRAND.primaryDark};padding:14px 32px;text-align:center;">
          <span style="display:inline-block;background:${m.bg};color:${m.color};padding:6px 16px;border-radius:999px;font-size:13px;font-weight:700;letter-spacing:.5px;">
            ${m.icon}&nbsp; ${m.label.toUpperCase()} — ${opts.entityType.toUpperCase()}
          </span>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND.text};">
            Bonjour ${opts.recipientName ? opts.recipientName : "Administrateur"} 👋
          </h1>
          <p style="margin:0 0 22px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
            Une nouvelle activité vient d'être enregistrée sur votre espace
            <strong style="color:${BRAND.text};">${BRAND.name}</strong>.
            Voici le détail complet de l'opération :
          </p>

          <!-- INFO CARD -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
            <tr><td style="background:#f9fafb;padding:14px 16px;border-bottom:1px solid ${BRAND.border};">
              <div style="font-size:11px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.5px;">Action effectuée</div>
              <div style="font-size:16px;font-weight:700;color:${BRAND.text};margin-top:4px;">
                ${m.label} ${opts.entityName ? `« ${opts.entityName} »` : ""}
              </div>
            </td></tr>

            <tr><td style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;width:38%;">Module</td>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;font-weight:600;">${opts.entityType}</td>
                </tr>
                ${opts.entityName ? `
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Élément concerné</td>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">${opts.entityName}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Auteur</td>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">
                    ${opts.userName}<br>
                    <span style="color:${BRAND.muted};font-size:12px;">${opts.userEmail}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Horodatage</td>
                  <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">${date}</td>
                </tr>
                ${opts.entityId ? `
                <tr>
                  <td style="padding:12px 16px;color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Référence</td>
                  <td style="padding:12px 16px;color:${BRAND.text};font-size:12px;font-family:'Courier New',monospace;">${opts.entityId}</td>
                </tr>` : ""}
              </table>
            </td></tr>
          </table>

          ${detailRows ? `
          <div style="margin-top:22px;">
            <div style="font-size:13px;font-weight:700;color:${BRAND.text};margin-bottom:10px;">📋 Données détaillées</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden;background:#fafafa;">
              ${detailRows}
            </table>
          </div>` : ""}

          <!-- INFO BLOCK -->
          <div style="margin-top:24px;padding:14px 16px;background:#eef2ff;border-left:4px solid ${BRAND.primary};border-radius:6px;">
            <div style="font-size:13px;color:${BRAND.text};line-height:1.6;">
              <strong>ℹ️ Info :</strong> Vous recevez ce message car vous êtes administrateur de l'espace famille.
              Toute action sensible (création, modification, suppression) déclenche une notification automatique.
            </div>
          </div>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid ${BRAND.border};">
          <div style="font-size:12px;color:${BRAND.muted};">
            © ${new Date().getFullYear()} <strong style="color:${BRAND.text};">${BRAND.name}</strong> — Tous droits réservés
          </div>
          <div style="font-size:11px;color:${BRAND.muted};margin-top:4px;">
            Notification automatique — merci de ne pas répondre à cet email.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
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

    // Personalised email per admin (pour saluer chacun par son prénom)
    for (const admin of adminList) {
      const recipientName = `${admin.first_name ?? ""} ${admin.last_name ?? ""}`.trim() || undefined;
      const html = buildHtml({
        action, userName, userEmail,
        entityType: entity_type, entityName: entity_name, entityId: entity_id, details,
        recipientName,
      });
      await client.send({
        from: `${BRAND.name} <${gmailUser}>`,
        to: admin.email!,
        subject,
        html,
        content: `${m.label} sur ${entity_type}${entity_name ? ` (${entity_name})` : ""} par ${userName}.`,
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
