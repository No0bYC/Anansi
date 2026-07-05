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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  try {
    const body = req.body || {};
    const from = body.From || "";

    // Sécurité : n'accepter que le numéro autorisé (le tien)
    const allowed = process.env.ALLOWED_WHATSAPP_NUMBER;
    if (allowed && !from.includes(allowed)) {
      res.setHeader("Content-Type", "text/xml");
      res.status(200).send("<Response></Response>");
      return;
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
    console.error("whatsapp webhook error:", e);
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlReply("Anansi a rencontré une erreur technique. Réessaie dans un instant."));
  }
};
