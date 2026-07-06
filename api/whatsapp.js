// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Webhook Twilio WhatsApp
// ═══════════════════════════════════════════════════════════════════════════

// Chargement défensif : si le module échoue à charger, on le SAIT au lieu de
// planter silencieusement (FUNCTION_INVOCATION_FAILED sans aucune info).
let botCore = null;
let loadError = null;
try {
  botCore = require("../lib/botCore");
} catch (e) {
  loadError = e && e.stack ? e.stack : String(e);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlReply(text) {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' + escapeXml(text) + "</Message></Response>";
}

function digitsOnly(str) {
  return String(str || "").replace(/\D/g, "");
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    res.status(200).json({
      status: loadError ? "❌ ERREUR AU CHARGEMENT DU MODULE botCore" : "whatsapp webhook actif",
      load_error: loadError,
      env_check: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
        ALLOWED_WHATSAPP_NUMBER_valeur: process.env.ALLOWED_WHATSAPP_NUMBER || "❌ NON DÉFINIE",
      },
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  if (loadError) {
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlReply("Erreur de chargement du module bot : " + loadError));
    return;
  }

  const { processMessage, transcribeAudio, fetchTwilioMedia } = botCore;

  try {
    const body = req.body || {};
    const from = body.From || "";

    const allowedRaw = process.env.ALLOWED_WHATSAPP_NUMBER;
    if (allowedRaw) {
      const fromDigits = digitsOnly(from);
      const allowedDigits = digitsOnly(allowedRaw);
      if (!allowedDigits || !fromDigits.includes(allowedDigits)) {
        res.setHeader("Content-Type", "text/xml");
        res.status(200).send("<Response></Response>");
        return;
      }
    }

    let text = (body.Body || "").trim();
    const numMedia = parseInt(body.NumMedia || "0", 10);

    if (numMedia > 0) {
      const mediaUrl = body.MediaUrl0;
      const contentType = body.MediaContentType0 || "";
      if (contentType.startsWith("audio")) {
        const { buffer, contentType: ct } = await fetchTwilioMedia(mediaUrl);
        text = await transcribeAudio(buffer, ct);
      }
    }

    if (!text) {
      res.setHeader("Content-Type", "text/xml");
      res.status(200).send(xmlReply("Je n'ai pas compris ce message (vide ou format non supporté). Essaie en texte ou en note vocale."));
      return;
    }

    const reply = await processMessage({ text, channel: "whatsapp" });
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlReply(reply));
  } catch (e) {
    console.error("❌ ERREUR whatsapp webhook:", e && e.stack ? e.stack : e);
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlReply("Anansi a rencontré une erreur technique : " + (e && e.message ? e.message : "inconnue")));
  }
};
