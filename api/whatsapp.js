// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Webhook Twilio WhatsApp
// ═══════════════════════════════════════════════════════════════════════════
const { processMessage, transcribeAudio, fetchTwilioMedia } = require("./_lib/botCore");

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
  // ── DIAGNOSTIC : visite cette URL dans un navigateur (GET) pour vérifier
  // que les variables d'environnement sont bien présentes côté serveur.
  // Ne révèle jamais les vraies valeurs des clés, juste leur présence.
  if (req.method === "GET") {
    res.status(200).json({
      status: "whatsapp webhook actif",
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

  try {
    const body = req.body || {};
    const from = body.From || "";
    console.log("From reçu:", from, "| Body:", body.Body, "| NumMedia:", body.NumMedia);

    const allowedRaw = process.env.ALLOWED_WHATSAPP_NUMBER;
    if (allowedRaw) {
      const fromDigits = digitsOnly(from);
      const allowedDigits = digitsOnly(allowedRaw);
      console.log("Comparaison numéro — reçu:", fromDigits, "| autorisé:", allowedDigits);
      if (!allowedDigits || !fromDigits.includes(allowedDigits)) {
        console.log("⚠️ Numéro non autorisé, message ignoré silencieusement.");
        res.setHeader("Content-Type", "text/xml");
        res.status(200).send("<Response></Response>");
        return;
      }
    } else {
      console.log("Aucun ALLOWED_WHATSAPP_NUMBER défini — tous les numéros acceptés.");
    }

    let text = (body.Body || "").trim();
    const numMedia = parseInt(body.NumMedia || "0", 10);

    if (numMedia > 0) {
      const mediaUrl = body.MediaUrl0;
      const contentType = body.MediaContentType0 || "";
      console.log("Média reçu:", contentType, mediaUrl);
      if (contentType.startsWith("audio")) {
        const { buffer, contentType: ct } = await fetchTwilioMedia(mediaUrl);
        text = await transcribeAudio(buffer, ct);
        console.log("Transcription:", text);
      }
    }

    if (!text) {
      res.setHeader("Content-Type", "text/xml");
      res.status(200).send(xmlReply("Je n'ai pas compris ce message (vide ou format non supporté). Essaie en texte ou en note vocale."));
      return;
    }

    console.log("Appel processMessage avec:", text);
    const reply = await processMessage({ text, channel: "whatsapp" });
    console.log("Réponse générée:", reply);

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlReply(reply));
  } catch (e) {
    console.error("❌ ERREUR whatsapp webhook:", e && e.stack ? e.stack : e);
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlReply("Anansi a rencontré une erreur technique : " + (e && e.message ? e.message : "inconnue")));
  }
};
