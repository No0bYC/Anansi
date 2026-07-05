// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Endpoint du chat intégré à la plateforme (même cerveau que WhatsApp)
// ═══════════════════════════════════════════════════════════════════════════
const { processMessage } = require("./_lib/botCore");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ error: "Message requis" });
      return;
    }
    const reply = await processMessage({ text: String(message).trim(), channel: "app" });
    res.status(200).json({ reply });
  } catch (e) {
    console.error("chat api error:", e);
    res.status(500).json({ error: "Erreur serveur : " + (e.message || "inconnue") });
  }
};
