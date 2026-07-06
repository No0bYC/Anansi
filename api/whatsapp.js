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

// Compare uniquement les chiffres (tolère espaces, tirets, "whatsapp:", etc.)
function digitsOnly(str) {
  return String(str || "").replace(/\D/g, "");
}

module.exports = async (req, res) => {
  console.log("=== /api/whatsapp appelé ===", new Date().toISOString());

  if (req.method !== "POST") {
    console.log("Méthode rejetée:", req.method);
    res.status(405).end();
    return;
  }

  try {
    const body = req.body || {};
    const from = body.From || "";
    console.log("From reçu:", from, "| Body:", body.Body, "| NumMedia:", body.NumMedia);

    // Sécurité : n'accepter que le numéro autorisé (comparaison tolérante, chiffres uniquement)
    const allowedRaw = process.env.ALLOWED_WHATSAPP_NUMBER;
    if (allowedRaw) {
      const fromDigits = digitsOnly(from);
      const allowedDigits = digitsOnly(allowedRaw);
      console.log("Comparaison numéro — reçu:", fromDigits, "| autorisé (env):", allowedDigits);
      if (!fromDigits.includes(allowedDigits) || !allowedDigits) {
        console.log("⚠️ Numéro non autorisé, message ignoré silencieusement.");
        res.setHeader("Content-Type", "text/xml");
        res.status(200).send("<Response></Response>");
        return;
      }
    } else {
      console.log("Aucun ALLOWED_WHATSAPP_NUMBER défini — tous les numéros sont acceptés (à corriger).");
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
      console.log("Texte vide après traitement, réponse par défaut.");
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
    res.status(200).send(xmlReply("Anansi a rencontré une erreur technique. Réessaie dans un instant."));
  }
};
