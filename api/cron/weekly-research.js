// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Veille automatique, répartie par jour choisi par contact
// Tourne CHAQUE JOUR (contrainte du plan Hobby : une exécution par jour), mais
// ne traite QUE les contacts dont monitoring_day correspond à aujourd'hui —
// c'est ce qui permet d'étaler la charge sur la semaine.
// ═══════════════════════════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");
const { runMonitoringResearch } = require("../../lib/botCore");

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

module.exports = async (req, res) => {
  if (process.env.CRON_SECRET) {
    const auth = req.headers["authorization"];
    if (auth !== "Bearer " + process.env.CRON_SECRET) {
      res.status(401).json({ error: "Non autorisé" });
      return;
    }
  }

  const supabase = getSupabase();
  const results = { scanned: 0, updated: 0, errors: [], today: new Date().getDay() };

  try {
    const { data: contacts, error } = await supabase.from("contacts").select("*");
    if (error) throw error;

    const todayDow = new Date().getDay(); // 0=dimanche ... 6=samedi, cohérent avec monitoring_day
    // Repli : un contact en veille sans jour choisi (ancienne donnée, ou pas
    // encore configuré) est traité le lundi par défaut, pour ne rien perdre.
    const monitored = (contacts || []).filter((c) => c.monitoring_enabled && (c.monitoring_day ?? 1) === todayDow);
    console.log("Veille du jour (" + todayDow + ") : " + monitored.length + " contact(s) programmé(s) aujourd'hui.");

    for (const contact of monitored) {
      results.scanned++;
      try {
        const report = await runMonitoringResearch(contact, contacts);
        if (report.found_anything) {
          const nextReports = [report, ...(contact.research_reports || [])].slice(0, 20);
          await supabase.from("contacts").update({
            research_reports: nextReports,
            last_research_at: report.date,
          }).eq("id", contact.id);
          results.updated++;
        } else {
          await supabase.from("contacts").update({ last_research_at: report.date }).eq("id", contact.id);
        }
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.error("Erreur veille pour " + contact.first_name + " " + contact.last_name + ":", e && e.message ? e.message : e);
        results.errors.push({ contact_id: contact.id, error: e.message || "erreur inconnue" });
      }
    }

    res.status(200).json({ ok: true, ...results });
  } catch (e) {
    console.error("Erreur veille automatique:", e && e.stack ? e.stack : e);
    res.status(500).json({ ok: false, error: e.message || "erreur inconnue" });
  }
};
