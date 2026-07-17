// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Analyse d'une conversation WhatsApp exportée
// Appelé depuis la fiche contact (app web), pas depuis le bot WhatsApp.
//
// Cadre d'analyse à quatre grilles de lecture, croisées en une qualification
// finale de la relation :
//   - Maslow   : registre de besoin dominant satisfait par la relation
//   - Bourdieu : capital en jeu (économique/culturel/social/symbolique) et
//                symétrie ou asymétrie de pouvoir
//   - Freud (tempéré) : patterns de communication observables — jamais un
//                diagnostic clinique, uniquement des patterns textuels
//   - Sartre   : authenticité (agentivité assumée) vs mauvaise foi
//                (justification, conformisme de rôle)
// ═══════════════════════════════════════════════════════════════════════════

const MAX_CHARS = 180000; // marge sûre sous la fenêtre de contexte du modèle

const ANALYSIS_TOOL = {
  name: "analyze_conversation",
  description: "Analyse psycho-sociologique d'une conversation WhatsApp, croisant plusieurs grilles de lecture pour qualifier la nature de la relation et le style de communication du contact.",
  input_schema: {
    type: "object",
    properties: {
      free_observations: {
        type: "string",
        description: "Observations libres : thèmes récurrents, tonalité générale, évolution du ton dans le temps si perceptible. 4-6 phrases, strictement factuel, basé uniquement sur ce qui est observable dans les messages.",
      },
      needs_register: {
        type: "object",
        description: "Grille de Maslow — à quel(s) niveau(x) de besoin cette relation répond principalement pour le contact, d'après ce qu'il exprime, recherche ou évite.",
        properties: {
          dominant_level: { type: "string", enum: ["Sécurité", "Appartenance", "Estime", "Accomplissement"] },
          secondary_level: { type: "string", enum: ["Sécurité", "Appartenance", "Estime", "Accomplissement"] },
          evidence: { type: "string", description: "Exemples concrets tirés des messages justifiant cette lecture." },
        },
        required: ["dominant_level", "evidence"],
      },
      capital_dynamics: {
        type: "object",
        description: "Grille de Bourdieu — quels types de capital circulent dans l'échange, et la relation est-elle symétrique ou structurellement asymétrique (qui initie, qui se justifie, qui détient l'info).",
        properties: {
          capital_types: { type: "array", items: { type: "string", enum: ["Économique", "Culturel", "Social", "Symbolique"] } },
          symmetry: { type: "string", enum: ["Symétrique", "Yann en position haute", "Contact en position haute"] },
          evidence: { type: "string", description: "Signaux concrets : qui initie les échanges, qui répond en premier, qui pose les questions vs qui se justifie, mentions de relations/statut." },
        },
        required: ["symmetry", "evidence"],
      },
      communication_patterns: {
        type: "object",
        description: "Lecture inspirée de la psychodynamique, tempérée — des patterns de communication OBSERVABLES dans le texte, jamais un diagnostic clinique.",
        properties: {
          self_vs_other_focus: { type: "string", enum: ["Centré sur soi", "Équilibré", "Centré sur l'autre"] },
          recurring_themes: { type: "array", items: { type: "string" } },
          notable_pattern: { type: "string", description: "Un pattern notable si clairement observable (déflexion par l'humour, intellectualisation, évitement, plainte récurrente non résolue) — sinon laisser vide, ne pas forcer." },
        },
      },
      authenticity_read: {
        type: "object",
        description: "Lecture existentialiste (Sartre) — le contact s'exprime-t-il depuis une posture d'agentivité assumée, ou de justification/conformisme (mauvaise foi) dans cette relation précisément.",
        properties: {
          posture: { type: "string", enum: ["Agentivité assumée", "Mixte", "Conformisme / justification"] },
          evidence: { type: "string", description: "Ex: langage de choix (\"je veux\", \"j'ai décidé\") vs langage de contrainte (\"je dois\", \"on m'oblige\")." },
        },
        required: ["posture", "evidence"],
      },
      disc_profile: {
        type: "object",
        description: "Lecture structurée du style de communication façon DISC — un signal indicatif sur le COMMENT communiquer avec cette personne, pas un diagnostic clinique.",
        properties: {
          primary: { type: "string", enum: ["Dominance", "Influence", "Stabilité", "Conformité"] },
          secondary: { type: "string", enum: ["Dominance", "Influence", "Stabilité", "Conformité"] },
          description: { type: "string", description: "2-3 phrases, avec des exemples concrets tirés des messages si possible." },
        },
        required: ["primary", "description"],
      },
      relationship_qualification: {
        type: "object",
        description: "Synthèse finale qui croise les quatre grilles précédentes pour qualifier la nature réelle de la relation.",
        properties: {
          type: { type: "string", enum: ["Utilitaire / instrumentale", "Affective / authentique", "Hiérarchique / déférente", "Symétrique entre pairs", "Superficielle / façade sociale"] },
          reciprocity_level: { type: "string", enum: ["Faible", "Modérée", "Forte"] },
          points_of_attention: { type: "string", description: "1-2 points de vigilance actionnables pour Yann si pertinent (ex: asymétrie non reconnue, dépendance, façade). Sinon laisser vide." },
        },
        required: ["type", "reciprocity_level"],
      },
      suggested_updates: {
        type: "object",
        description: "Mises à jour suggérées pour la fiche CRM — uniquement si clairement déductible des messages, sinon laisser vide. Le levier principal doit être cohérent avec needs_register.",
        properties: {
          primary_lever: { type: "string", enum: ["statut", "réciprocité", "appartenance", "intérêt", "cohérence"] },
          secondary_lever: { type: "string", enum: ["statut", "réciprocité", "appartenance", "intérêt", "cohérence"] },
          discussion_points_add: { type: "array", items: { type: "string" } },
          topics_to_avoid_add: { type: "array", items: { type: "string" } },
          hobbies_add: { type: "array", items: { type: "string" } },
          current_desire: { type: "string" },
          red_lines: { type: "string" },
        },
      },
    },
    required: ["free_observations", "needs_register", "capital_dynamics", "authenticity_read", "disc_profile", "relationship_qualification"],
  },
};

// Échantillonnage réparti dans le temps si la conversation dépasse la limite —
// garde une couverture chronologique complète plutôt que de couper le début ou la fin.
function sampleTranscript(messages) {
  const full = messages.map((m) => m.raw).join("\n");
  if (full.length <= MAX_CHARS) return { text: full, sampled: false };
  const keepRatio = MAX_CHARS / full.length;
  const step = Math.max(1, Math.round(1 / keepRatio));
  const sampled = messages.filter((_, i) => i % step === 0);
  return { text: sampled.map((m) => m.raw).join("\n"), sampled: true };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { contactName, messages, dateRange } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Aucun message fourni." });
      return;
    }

    const { text: transcript, sampled } = sampleTranscript(messages);

    const system =
      "Tu es un analyste relationnel combinant plusieurs grilles de lecture en sciences humaines pour aider Yann à mieux " +
      "comprendre sa relation avec " + contactName + ", à partir d'un export de conversation WhatsApp. " +
      "Applique successivement quatre lentilles, chacune avec un objectif précis :\n" +
      "1. MASLOW — identifie à quel registre de besoin (sécurité, appartenance, estime, accomplissement) cette relation " +
      "répond principalement pour le contact, d'après ce qu'il exprime ou recherche réellement dans l'échange.\n" +
      "2. BOURDIEU — repère quel capital circule (économique, culturel, social, symbolique) et si la relation est " +
      "structurellement symétrique ou asymétrique : qui initie les échanges, qui répond en premier, qui pose des " +
      "questions vs qui se justifie, qui mentionne son réseau ou son statut.\n" +
      "3. LECTURE PSYCHODYNAMIQUE TEMPÉRÉE — repère des patterns de communication observables (déflexion par l'humour, " +
      "intellectualisation, focus sur soi vs sur l'autre, thèmes récurrents non résolus). Ce n'est JAMAIS un diagnostic " +
      "clinique — uniquement des patterns textuels visibles.\n" +
      "4. SARTRE — évalue si le contact s'exprime depuis une posture d'agentivité assumée (\"je veux\", \"j'ai décidé\") " +
      "ou de justification/conformisme de rôle (\"je dois\", \"on m'oblige\") dans cette relation précisément.\n" +
      "Termine par une SYNTHÈSE qui croise ces quatre lectures pour qualifier le type réel de la relation et son niveau " +
      "de réciprocité.\n" +
      "Règles strictes : n'infère RIEN qui ne soit pas raisonnablement déductible du texte fourni. Cite des exemples " +
      "concrets à chaque fois que possible. Reste nuancé — c'est une lecture indicative, jamais un verdict. " +
      "Si un signal est insuffisant sur une dimension, dis-le plutôt que de forcer une conclusion." +
      (sampled ? " Note : cet extrait est un échantillonnage représentatif réparti sur toute la période, pas l'intégralité de la conversation (volume trop important)." : "") +
      " Utilise l'outil fourni pour structurer ta réponse.";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        system,
        messages: [{ role: "user", content: "Transcript de la conversation :\n\n" + transcript }],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "analyze_conversation" },
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Claude analyze-conversation error:", errText);
      res.status(500).json({ error: "Erreur d'analyse : " + errText });
      return;
    }

    const data = await anthropicRes.json();
    const toolUse = (data.content || []).find((b) => b.type === "tool_use");
    if (!toolUse) {
      res.status(500).json({ error: "Aucune analyse retournée." });
      return;
    }

    const result = toolUse.input;
    const profile = {
      analyzed_at: new Date().toISOString().split("T")[0],
      message_count: messages.length,
      date_range: dateRange || null,
      free_observations: result.free_observations || "",
      needs_register: result.needs_register || null,
      capital_dynamics: result.capital_dynamics || null,
      communication_patterns: result.communication_patterns || null,
      authenticity_read: result.authenticity_read || null,
      disc_profile: result.disc_profile || null,
      relationship_qualification: result.relationship_qualification || null,
      confidence_note:
        "Basé sur " + messages.length + " message(s)" +
        (dateRange && dateRange.from && dateRange.to ? " entre " + dateRange.from + " et " + dateRange.to : "") +
        (sampled ? " (échantillon représentatif)" : "") +
        " — une lecture indicative croisant plusieurs grilles, pas un diagnostic.",
    };

    res.status(200).json({ profile, suggested_updates: result.suggested_updates || {} });
  } catch (e) {
    console.error("analyze-conversation error:", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Erreur serveur : " + (e.message || "inconnue") });
  }
};
