// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Veille déclenchée manuellement depuis la fiche contact
// ═══════════════════════════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");
const { runMonitoringResearch } = require("../lib/botCore");

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { contactId } = req.body || {};
    if (!contactId) {
      res.status(400).json({ error: "contactId requis" });
      return;
    }
    const supabase = getSupabase();
    const { data: contacts, error } = await supabase.from("contacts").select("*");
    if (error) throw error;

    const contact = contacts.find((c) => String(c.id) === String(contactId));
    if (!contact) {
      res.status(404).json({ error: "Contact introuvable" });
      return;
    }

    const report = await runMonitoringResearch(contact, contacts);
    const nextReports = report.found_anything ? [report, ...(contact.research_reports || [])].slice(0, 20) : (contact.research_reports || []);

    const { data: updated, error: updateError } = await supabase.from("contacts").update({
      research_reports: nextReports,
      last_research_at: report.date,
    }).eq("id", contactId).select().single();
    if (updateError) throw updateError;

    res.status(200).json({ ok: true, report, contact: updated });
  } catch (e) {
    console.error("research-now error:", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Erreur serveur : " + (e.message || "inconnue") });
  }
};
