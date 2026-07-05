// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Historique de conversation (affiché dans le widget de chat)
// ═══════════════════════════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from("bot_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    res.status(200).json({ messages: data || [] });
  } catch (e) {
    console.error("chat-history error:", e);
    res.status(500).json({ error: e.message || "inconnue" });
  }
};
