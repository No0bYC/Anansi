// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Endpoint du chat intégré à la plateforme (même cerveau que WhatsApp)
// ═══════════════════════════════════════════════════════════════════════════
let botCore = null;
let loadError = null;
try {
  botCore = require("../lib/botCore");
} catch (e) {
  loadError = e && e.stack ? e.stack : String(e);
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    res.status(200).json({
      status: loadError ? "❌ ERREUR AU CHARGEMENT DU MODULE botCore" : "chat endpoint actif",
      load_error: loadError,
    });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (loadError) {
    res.status(500).json({ error: "Erreur de chargement du module bot : " + loadError });
    return;
  }
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ error: "Message requis" });
      return;
    }
    const reply = await botCore.processMessage({ text: String(message).trim(), channel: "app" });
    res.status(200).json({ reply });
  } catch (e) {
    console.error("chat api error:", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Erreur serveur : " + (e.message || "inconnue") });
  }
};
