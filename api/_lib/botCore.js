// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Moteur de conversation du bot (partagé WhatsApp + chat in-app)
// ═══════════════════════════════════════════════════════════════════════════
const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const LEVERS = ["statut", "réciprocité", "appartenance", "intérêt", "cohérence"];
const EGOS = ["faire", "avoir", "être perçu"];
const RELATION_TYPES = ["Famille","Ami(e)","Collègue","Partenaire","Connaissance","Voisin","Mentor","Mentee","Client","Fournisseur","Investisseur","Concurrent"];

// ── Normalisation texte (accents, casse) pour le matching flou ───────────────
function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Distance de Levenshtein simple (pour tolérer les fautes de frappe/accents)
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

// ── Recherche floue d'un contact par nom mentionné ────────────────────────────
function findContactMatches(nameGuess, contacts) {
  if (!nameGuess) return [];
  const scored = contacts.map((c) => {
    const full = (c.first_name || "") + " " + (c.last_name || "");
    const alias = c.alias || "";
    const scoreFull = similarity(nameGuess, full);
    const scoreFirst = similarity(nameGuess, c.first_name || "");
    const scoreAlias = alias ? similarity(nameGuess, alias) : 0;
    const score = Math.max(scoreFull, scoreFirst, scoreAlias);
    return { contact: c, score };
  });
  return scored.filter((s) => s.score >= 0.45).sort((a, b) => b.score - a.score);
}

// ── Score de complétude (identique à la logique de dédoublonnage SQL) ────────
function completenessScore(c) {
  let s = 0;
  if ((c.role || "").trim()) s++;
  if ((c.company || "").trim()) s++;
  if ((c.sectors || []).length) s++;
  if ((c.email || "").trim()) s++;
  if ((c.phone || "").trim()) s++;
  if ((c.notes || "").trim()) s++;
  if ((c.photo_url || "").trim()) s++;
  if ((c.primary_lever || "").trim()) s++;
  if ((c.ego_type || "").trim()) s++;
  if ((c.hobbies || []).length) s++;
  if ((c.discussion_points || []).length) s++;
  if ((c.my_relation || []).length) s++;
  if ((c.current_desire || "").trim()) s++;
  if ((c.connections || []).length) s++;
  return s; // max 14
}

// Ordre de priorité des champs à combler en interview (les plus structurants d'abord)
const INTERVIEW_FIELD_ORDER = [
  "my_relation", "sectors", "role_company", "primary_lever",
  "phone", "hobbies", "current_desire", "ego_type", "notes",
];

function pickInterviewTarget(contacts, excludeIds) {
  const pool = contacts.filter(
    (c) => c.known_personally && !(excludeIds || []).includes(String(c.id)) && completenessScore(c) < 10
  );
  if (pool.length === 0) return null;
  pool.sort((a, b) => completenessScore(a) - completenessScore(b));
  const target = pool[0];
  for (const field of INTERVIEW_FIELD_ORDER) {
    if (field === "my_relation" && !(target.my_relation || []).length) return { contact: target, field };
    if (field === "sectors" && !(target.sectors || []).length) return { contact: target, field };
    if (field === "role_company" && !(target.role || "").trim() && !(target.company || "").trim()) return { contact: target, field };
    if (field === "primary_lever" && !(target.primary_lever || "").trim()) return { contact: target, field };
    if (field === "phone" && !(target.phone || "").trim()) return { contact: target, field };
    if (field === "hobbies" && !(target.hobbies || []).length) return { contact: target, field };
    if (field === "current_desire" && !(target.current_desire || "").trim()) return { contact: target, field };
    if (field === "ego_type" && !(target.ego_type || "").trim()) return { contact: target, field };
    if (field === "notes" && !(target.notes || "").trim()) return { contact: target, field };
  }
  return { contact: target, field: "notes" };
}

function formatInterviewQuestion(contact, field) {
  const name = contact.first_name || "cette personne";
  const q = {
    my_relation: `C'est quoi ta relation avec ${name} ? (famille, ami, collègue, partenaire, client, investisseur...)`,
    sectors: `${name} travaille dans quel secteur ?`,
    role_company: `Quel est le poste de ${name}, et dans quelle entreprise ?`,
    primary_lever: `Qu'est-ce qui compte le plus pour ${name} ? (être reconnu/statut, rendre service en retour/réciprocité, appartenir à un cercle, son intérêt direct, ou la cohérence avec ses positions passées)`,
    phone: `Tu as le numéro de ${name} ?`,
    hobbies: `${name} a des passions ou hobbies particuliers ?`,
    current_desire: `${name} cherche quoi en ce moment ? Un projet, un poste, un investissement...`,
    ego_type: `${name} est plutôt du genre à vouloir faire des choses, avoir des choses, ou être perçu d'une certaine façon ?`,
    notes: `Une anecdote ou observation à retenir sur ${name} ?`,
  };
  return q[field] || `Dis-moi en plus sur ${name}.`;
}

// Applique la réponse d'interview au bon format de champ
function applyInterviewAnswer(contact, field, answerRaw) {
  const answer = String(answerRaw || "").trim();
  const patch = {};
  if (field === "my_relation") {
    const found = RELATION_TYPES.filter((rt) => normalize(answer).includes(normalize(rt)));
    patch.my_relation = found.length ? Array.from(new Set([...(contact.my_relation || []), ...found])) : [...(contact.my_relation || []), answer];
  } else if (field === "sectors") {
    const parts = answer.split(/,| et /).map((s) => s.trim()).filter(Boolean);
    patch.sectors = Array.from(new Set([...(contact.sectors || []), ...parts]));
    patch.sector = patch.sectors[0] || "";
  } else if (field === "role_company") {
    const m = answer.split(/ chez | à | @ /i);
    if (m.length >= 2) { patch.role = m[0].trim(); patch.company = m.slice(1).join(" ").trim(); }
    else { patch.role = answer; }
  } else if (field === "primary_lever") {
    const found = LEVERS.find((l) => similarity(answer, l) > 0.5) || LEVERS.find((l) => normalize(answer).includes(normalize(l).slice(0, 4)));
    patch.primary_lever = found || answer;
  } else if (field === "phone") {
    patch.phone = answer;
  } else if (field === "hobbies") {
    const parts = answer.split(/,| et /).map((s) => s.trim()).filter(Boolean);
    patch.hobbies = Array.from(new Set([...(contact.hobbies || []), ...parts]));
  } else if (field === "current_desire") {
    patch.current_desire = answer;
  } else if (field === "ego_type") {
    const found = EGOS.find((e) => similarity(answer, e) > 0.4) ||
      (normalize(answer).includes("faire") ? "faire" : normalize(answer).includes("avoir") ? "avoir" : normalize(answer).includes("percu") ? "être perçu" : answer);
    patch.ego_type = found;
  } else if (field === "notes") {
    patch.notes = contact.notes ? contact.notes + "\n" + answer : answer;
  }
  return patch;
}

// ── État de conversation (singleton, un seul utilisateur) ────────────────────
async function getBotState() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("bot_state").select("*").eq("id", "main").single();
  if (error || !data) return { id: "main", pending: null, interview_active: false, interview_asked: [] };
  return data;
}

async function setBotState(patch) {
  const supabase = getSupabase();
  await supabase.from("bot_state").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", "main");
}

async function logMessage(channel, role, content) {
  const supabase = getSupabase();
  await supabase.from("bot_messages").insert([{ channel, role, content }]);
}

// ── Whisper (transcription vocale) ────────────────────────────────────────────
async function transcribeAudio(buffer, mimeType) {
  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType || "audio/ogg" });
  form.append("file", blob, "audio.ogg");
  form.append("model", "whisper-1");
  form.append("language", "fr");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: form,
  });
  if (!res.ok) throw new Error("Whisper error: " + (await res.text()));
  const data = await res.json();
  return data.text || "";
}

async function fetchTwilioMedia(url) {
  const auth = Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64");
  const res = await fetch(url, { headers: { Authorization: "Basic " + auth } });
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: res.headers.get("content-type") };
}

// ── Extraction via Claude (tool-use forcé) ────────────────────────────────────
const EXTRACT_TOOL = {
  name: "extract_contact_info",
  description: "Analyse un message vocal ou texte à propos d'un contact et extrait les informations structurées à enregistrer dans le CRM.",
  input_schema: {
    type: "object",
    properties: {
      intent: { type: "string", enum: ["update_contact", "create_contact", "unclear"] },
      contact_name_guess: { type: "string", description: "Nom ou prénom de la personne mentionnée, tel qu'entendu dans le message." },
      fields: {
        type: "object",
        properties: {
          role: { type: "string" },
          company: { type: "string" },
          sectors: { type: "array", items: { type: "string" } },
          location_city: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          hobbies_add: { type: "array", items: { type: "string" }, description: "Nouveaux hobbies à AJOUTER, sans supprimer les existants." },
          discussion_points_add: { type: "array", items: { type: "string" } },
          topics_to_avoid_add: { type: "array", items: { type: "string" } },
          notes_add: { type: "string", description: "Note ou observation libre à ajouter." },
          primary_lever: { type: "string", enum: LEVERS },
          secondary_lever: { type: "string", enum: LEVERS },
          tertiary_lever: { type: "string", enum: LEVERS },
          ego_type: { type: "string", enum: EGOS },
          my_relation_add: { type: "array", items: { type: "string" } },
          current_desire: { type: "string" },
          red_lines: { type: "string" },
          groups_add: { type: "array", items: { type: "string" } },
          interaction_summary: { type: "string", description: "Résumé d'une rencontre/interaction récente à logger dans l'historique." },
          follow_up: { type: "string", description: "Action à faire, à créer comme rappel urgent." },
        },
      },
      new_contact: {
        type: "object",
        description: "Rempli uniquement si intent=create_contact et qu'aucun contact existant ne correspond.",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          role: { type: "string" },
          company: { type: "string" },
          sectors: { type: "array", items: { type: "string" } },
        },
      },
    },
    required: ["intent"],
  },
};

async function callClaudeExtract(userText, contactNames) {
  const system =
    "Tu es Anansi, l'assistant qui aide Yann à tenir à jour son CRM relationnel personnel. " +
    "Le message vient d'une note vocale ou d'un texte WhatsApp, parfois informel ou mal transcrit. " +
    "Contacts déjà connus (pour t'aider à identifier de qui on parle) : " + contactNames.join(", ") + ". " +
    "Extrais uniquement ce qui est explicitement dit, n'invente rien. Utilise l'outil fourni.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userText }],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_contact_info" },
    }),
  });
  if (!res.ok) throw new Error("Claude API error: " + (await res.text()));
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === "tool_use");
  if (!toolUse) return { intent: "unclear" };
  return toolUse.input;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRÉPARATION DE RENCONTRE — "Préparer rencontre avec X [et Y...]"
// ═══════════════════════════════════════════════════════════════════════════
function extractMeetingPrepNames(text) {
  const m = text.match(/pr[ée]parer?\s+(?:une\s+|la\s+)?rencontre\s+avec\s+(.+)/i);
  if (!m) return null;
  return m[1].split(/,| et | & /i).map((s) => s.trim()).filter(Boolean);
}

// Recherche des mentions d'un contact dans les fiches des AUTRES contacts
// (notes, désir actuel, ligne rouge, points de discussion, historique d'interactions)
function searchInternalMentions(contact, allContacts) {
  const first = normalize(contact.first_name || "");
  const last = normalize(contact.last_name || "");
  if (!first && !last) return [];
  const results = [];
  allContacts.forEach((other) => {
    if (String(other.id) === String(contact.id)) return;
    const haystacks = [
      { field: "note", text: other.notes || "" },
      { field: "désir actuel", text: other.current_desire || "" },
      { field: "ligne rouge", text: other.red_lines || "" },
      { field: "points de discussion", text: (other.discussion_points || []).join(" ; ") },
    ];
    (other.interactions || []).forEach((it) => haystacks.push({ field: "interaction", text: (it.summary || "") + " " + (it.follow_up || "") }));
    haystacks.forEach((h) => {
      const nh = normalize(h.text);
      if (nh && ((first && nh.includes(first)) || (last && last.length > 2 && nh.includes(last)))) {
        results.push({ from: ((other.first_name || "") + " " + (other.last_name || "")).trim(), field: h.field, snippet: h.text.slice(0, 180) });
      }
    });
  });
  return results;
}

const MEETING_PREP_TOOL = {
  name: "meeting_prep_output",
  description: "Prépare une note de rencontre synthétique et, si pertinent, des suggestions d'enrichissement de fiche.",
  input_schema: {
    type: "object",
    properties: {
      briefing: { type: "string", description: "Note de préparation, texte brut lisible sur WhatsApp, listes courtes, sans markdown complexe." },
      per_contact: {
        type: "array",
        description: "Suggestions d'ajout aux fiches, uniquement si déductible des infos fournies mais pas encore enregistré. Ne rien forcer.",
        items: {
          type: "object",
          properties: {
            contact_id: { type: "string" },
            discussion_points_add: { type: "array", items: { type: "string" } },
            topics_to_avoid_add: { type: "array", items: { type: "string" } },
            notes_add: { type: "string" },
          },
        },
      },
    },
    required: ["briefing"],
  },
};

function buildMeetingPrepContext(contacts, mentionsMap) {
  return contacts
    .map((c) => {
      const lines = [
        "— " + c.first_name + " " + c.last_name + " (id:" + c.id + ") —",
        c.role || c.company ? "Poste/Entreprise: " + [c.role, c.company].filter(Boolean).join(" chez ") : "",
        (c.sectors || []).length ? "Secteurs: " + c.sectors.join(", ") : "",
        (c.my_relation || []).length ? "Relation avec Yann: " + c.my_relation.join(", ") : "",
        c.primary_lever ? "Levier principal: " + c.primary_lever : "",
        c.secondary_lever ? "Levier secondaire: " + c.secondary_lever : "",
        c.ego_type ? "Ego: " + c.ego_type : "",
        c.current_desire ? "Désir actuel: " + c.current_desire : "",
        c.red_lines ? "Ligne rouge connue: " + c.red_lines : "",
        (c.hobbies || []).length ? "Hobbies: " + c.hobbies.join(", ") : "",
        (c.discussion_points || []).length ? "Points de discussion déjà connus: " + c.discussion_points.join(", ") : "",
        (c.topics_to_avoid || []).length ? "À éviter (déjà connu): " + c.topics_to_avoid.join(", ") : "",
        c.notes ? "Notes: " + c.notes : "",
        (mentionsMap[c.id] || []).length ? "Mentionné ailleurs dans la base: " + mentionsMap[c.id].map((m) => m.from + " (" + m.field + "): " + m.snippet).join(" | ") : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

async function callClaudeMeetingPrep(contacts, mentionsMap) {
  const context = buildMeetingPrepContext(contacts, mentionsMap);
  const isGroup = contacts.length > 1;
  const system =
    "Tu es Anansi, l'assistant qui prépare Yann avant une rencontre. Sur la base des données fournies : " +
    "donne 3 à 5 points de discussion recommandés (classés par pertinence), les lignes rouges à éviter, " +
    "et un angle d'ouverture adapté au levier principal de la personne. " +
    (isGroup
      ? "C'est une rencontre de GROUPE : signale aussi les points communs entre les participants, leurs connexions déjà existantes, et tout sujet risqué à éviter devant tout le monde. "
      : "") +
    "Reste synthétique. Texte brut, pas de markdown complexe.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: context }],
      tools: [MEETING_PREP_TOOL],
      tool_choice: { type: "tool", name: "meeting_prep_output" },
    }),
  });
  if (!res.ok) throw new Error("Claude meeting prep error: " + (await res.text()));
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === "tool_use");
  return toolUse ? toolUse.input : { briefing: "Je n'ai pas réussi à préparer la note, réessaie." };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHISSEMENT WEB — "Enrichir X" / "Recherche web X" / "Compléter la fiche de X"
// ═══════════════════════════════════════════════════════════════════════════
function extractEnrichTarget(text) {
  const m = text.match(/^(?:enrichir|recherche\s+web(?:\s+sur)?|compl[ée]t(?:er|e)\s+la\s+fiche\s+de)\s+(.+)/i);
  return m ? m[1].trim() : null;
}

// Recherche web via l'outil natif de Claude (pas besoin d'une clé API de recherche séparée)
async function webResearchContact(contact, mentions) {
  const fullName = ((contact.first_name || "") + " " + (contact.last_name || "")).trim();
  const context = [
    contact.company ? "Entreprise: " + contact.company : "",
    contact.role ? "Poste: " + contact.role : "",
    contact.location_city ? "Ville: " + contact.location_city : "",
  ].filter(Boolean).join(", ");
  const mentionsText = mentions.length
    ? "\n\nMentions déjà présentes dans d'autres fiches Anansi:\n" + mentions.map((m) => "- (" + m.from + ") " + m.snippet).join("\n")
    : "";
  const prompt =
    "Cherche des informations publiques fiables et récentes sur : " + fullName + (context ? " (" + context + ")" : "") + ". " +
    "Priorise : profil LinkedIn, actualités professionnelles récentes, activités publiques. " +
    "Reste strictement factuel, ne suppose rien si tu ne trouves pas la bonne personne. " +
    "Réponds en 3 à 5 points synthétiques maximum, chaque point avec le lien source." +
    mentionsText;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  if (!res.ok) throw new Error("Claude web search error: " + (await res.text()));
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n\n").trim();
}

const ENRICH_TOOL = {
  name: "structure_enrichment",
  description: "Convertit une synthèse de recherche en informations structurées, chacune synthétique et accompagnée d'un lien si disponible.",
  input_schema: {
    type: "object",
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Information synthétique en une phrase courte." },
            url: { type: "string", description: "Lien source si disponible, sinon vide." },
          },
          required: ["text"],
        },
      },
      discussion_points_add: { type: "array", items: { type: "string" } },
    },
  },
};

async function structureEnrichment(researchText) {
  if (!researchText || !researchText.trim()) return { insights: [] };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 800,
      system: "Convertis cette synthèse de recherche en informations structurées pour un CRM relationnel. Sois synthétique, une phrase par info, avec le lien source associé quand il existe.",
      messages: [{ role: "user", content: researchText }],
      tools: [ENRICH_TOOL],
      tool_choice: { type: "tool", name: "structure_enrichment" },
    }),
  });
  if (!res.ok) throw new Error("Claude structure error: " + (await res.text()));
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === "tool_use");
  return toolUse ? toolUse.input : { insights: [] };
}

// ── Construction du patch Supabase à partir des champs extraits ──────────────
function buildPatchFromFields(contact, fields) {
  const patch = {};
  if (fields.role) patch.role = fields.role;
  if (fields.company) patch.company = fields.company;
  if (fields.sectors && fields.sectors.length) {
    patch.sectors = Array.from(new Set([...(contact.sectors || []), ...fields.sectors]));
    patch.sector = patch.sectors[0];
  }
  if (fields.location_city) patch.location_city = fields.location_city;
  if (fields.phone) patch.phone = fields.phone;
  if (fields.email) patch.email = fields.email;
  if (fields.hobbies_add && fields.hobbies_add.length) patch.hobbies = Array.from(new Set([...(contact.hobbies || []), ...fields.hobbies_add]));
  if (fields.discussion_points_add && fields.discussion_points_add.length) patch.discussion_points = Array.from(new Set([...(contact.discussion_points || []), ...fields.discussion_points_add]));
  if (fields.topics_to_avoid_add && fields.topics_to_avoid_add.length) patch.topics_to_avoid = Array.from(new Set([...(contact.topics_to_avoid || []), ...fields.topics_to_avoid_add]));
  if (fields.notes_add) patch.notes = contact.notes ? contact.notes + "\n" + fields.notes_add : fields.notes_add;
  if (fields.primary_lever) patch.primary_lever = fields.primary_lever;
  if (fields.secondary_lever) patch.secondary_lever = fields.secondary_lever;
  if (fields.tertiary_lever) patch.tertiary_lever = fields.tertiary_lever;
  if (fields.ego_type) patch.ego_type = fields.ego_type;
  if (fields.my_relation_add && fields.my_relation_add.length) patch.my_relation = Array.from(new Set([...(contact.my_relation || []), ...fields.my_relation_add]));
  if (fields.current_desire) patch.current_desire = fields.current_desire;
  if (fields.red_lines) patch.red_lines = fields.red_lines;
  if (fields.groups_add && fields.groups_add.length) patch.groups = Array.from(new Set([...(contact.groups || []), ...fields.groups_add]));
  if (fields.interaction_summary) {
    patch.interactions = [
      { date: new Date().toISOString().split("T")[0], type: "Note vocale", summary: fields.interaction_summary, follow_up: fields.follow_up || null },
      ...(contact.interactions || []),
    ];
  }
  if (fields.follow_up && !fields.interaction_summary) {
    patch.reminders = [{ message: fields.follow_up, due: "À définir", urgent: false }, ...(contact.reminders || [])];
  }
  if (fields.insights && fields.insights.length) {
    const today = new Date().toISOString().split("T")[0];
    patch.web_insights = [
      ...fields.insights.map((i) => ({ text: i.text, url: i.url || "", date: today, source: i.url ? "web" : "internal" })),
      ...(contact.web_insights || []),
    ];
  }
  return patch;
}

function summarizePatch(patch) {
  const lines = [];
  const labels = {
    role: "Poste", company: "Entreprise", sectors: "Secteurs", location_city: "Ville", phone: "Téléphone", email: "Email",
    hobbies: "Hobbies", discussion_points: "Points de discussion", topics_to_avoid: "À éviter", notes: "Note",
    primary_lever: "Levier principal", secondary_lever: "Levier secondaire", tertiary_lever: "Levier tertiaire",
    ego_type: "Ego", my_relation: "Relation", current_desire: "Désir actuel", red_lines: "Ligne rouge",
    groups: "Groupes", interactions: "Nouvelle interaction", reminders: "Nouveau rappel", web_insights: "Info trouvée",
  };
  for (const k of Object.keys(patch)) {
    if (k === "sector") continue;
    const v = patch[k];
    if (k === "interactions") { lines.push("• Interaction: " + v[0].summary); continue; }
    if (k === "reminders") { lines.push("• Rappel: " + v[0].message); continue; }
    if (k === "web_insights") { lines.push("• " + labels.web_insights + ": " + v[0].text + (v[0].url ? " (" + v[0].url + ")" : "")); continue; }
    const val = Array.isArray(v) ? v.join(", ") : v;
    lines.push("• " + (labels[k] || k) + ": " + val);
  }
  return lines.join("\n");
}

// ── Création d'un nouveau contact avec défauts sûrs ───────────────────────────
async function createContactFromData(data) {
  const supabase = getSupabase();
  const row = {
    genre: "M", first_name: data.first_name || "?", last_name: data.last_name || "",
    role: data.role || "", company: data.company || "",
    sectors: data.sectors || [], sector: (data.sectors || [])[0] || "",
    known_personally: true, my_relation: [], groups: [],
    hobbies: [], discussion_points: [], topics_to_avoid: [], tags: [],
    connections: [], related: [], interactions: [], reminders: [], media: [], connection_types: {},
    utility_score: 5, sentiment_score: 5, reliability_score: 5, influence_score: 5,
    reciprocity_score: 5, momentum_score: 5, potential_score: 5, relational_debt: 0,
    initials: (data.first_name || "?")[0] + ((data.last_name || "")[0] || ""),
    last_interaction: new Date().toISOString().split("T")[0],
  };
  const { data: inserted, error } = await supabase.from("contacts").insert([row]).select().single();
  if (error) throw error;
  return inserted;
}

async function applyPatch(contactId, patch) {
  const supabase = getSupabase();
  const { error } = await supabase.from("contacts").update(patch).eq("id", contactId);
  if (error) throw error;
}

async function fetchAllContacts() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("contacts").select("*");
  if (error) throw error;
  return data || [];
}

const AFFIRM = ["oui", "ok", "d'accord", "daccord", "vas-y", "vasy", "confirme", "yes", "yep", "exact", "correct"];
const NEGATE = ["non", "annule", "stop", "no", "pas ça", "faux"];
const isAffirmative = (t) => AFFIRM.some((a) => normalize(t).includes(a));
const isNegative = (t) => NEGATE.some((n) => normalize(t) === n || normalize(t).includes(n));
const isStopCommand = (t) => ["stop", "pause", "fin", "arrete", "arrête"].some((s) => normalize(t).includes(s));
const isInterviewTrigger = (t) => {
  const n = normalize(t);
  return n.includes("interview") || n.includes("pose moi une question") || n.includes("pose-moi une question") || n === "questions";
};

// ═══════════════════════════════════════════════════════════════════════════
// PROCESS MESSAGE — orchestrateur principal
// ═══════════════════════════════════════════════════════════════════════════
async function processMessage({ text, channel }) {
  await logMessage(channel, "user", text);
  const state = await getBotState();
  const contacts = await fetchAllContacts();
  let reply = "";

  const pending = state.pending || null;

  // ── 0) Commandes explicites — toujours prioritaires, même en pleine interview ──
  const prepNames = extractMeetingPrepNames(text);
  if (prepNames) {
    const resolved = [];
    const notFound = [];
    for (const n of prepNames) {
      const matches = findContactMatches(n, contacts);
      if (matches.length) resolved.push(matches[0].contact);
      else notFound.push(n);
    }
    if (resolved.length === 0) {
      reply = "Je ne trouve aucun des contacts mentionnés (" + prepNames.join(", ") + ").";
      await setBotState({ pending: null });
    } else {
      const mentionsMap = {};
      resolved.forEach((c) => { mentionsMap[c.id] = searchInternalMentions(c, contacts); });
      const prep = await callClaudeMeetingPrep(resolved, mentionsMap);
      reply = prep.briefing;
      if (notFound.length) reply += "\n\n(Je n'ai pas trouvé : " + notFound.join(", ") + ")";
      const suggestions = (prep.per_contact || []).filter((p) => p.discussion_points_add || p.topics_to_avoid_add || p.notes_add);
      if (suggestions.length) {
        await setBotState({ pending: { type: "confirm_prep_suggestions", suggestions } });
        reply += "\n\nJ'ai aussi quelques suggestions à ajouter aux fiches. Tape OUI pour les enregistrer, ou ignore ce message.";
      } else {
        await setBotState({ pending: null });
      }
    }
    await logMessage(channel, "bot", reply);
    return reply;
  }

  const enrichName = extractEnrichTarget(text);
  if (enrichName) {
    const matches = findContactMatches(enrichName, contacts);
    if (!matches.length) {
      reply = "Je ne trouve personne nommé \"" + enrichName + "\" dans ta base.";
      await setBotState({ pending: null });
    } else {
      const contact = matches[0].contact;
      const mentions = searchInternalMentions(contact, contacts);
      const research = await webResearchContact(contact, mentions);
      const structured = await structureEnrichment(research);
      const patch = buildPatchFromFields(contact, structured);
      if (Object.keys(patch).length === 0) {
        reply = "Recherche faite sur " + contact.first_name + ", mais rien de nouveau à ajouter pour l'instant" + (research ? " :\n\n" + research : ".");
        await setBotState({ pending: null });
      } else {
        const summary = summarizePatch(patch);
        await setBotState({ pending: { type: "confirm_update", contact_id: contact.id, patch } });
        reply = "Voici ce que j'ai trouvé sur " + contact.first_name + " :\n\n" + summary + "\n\nConfirme avec OUI pour l'ajouter à sa fiche ?";
      }
    }
    await logMessage(channel, "bot", reply);
    return reply;
  }

  // ── 1) Une action est en attente de réponse ────────────────────────────────
  if (pending) {
    if (pending.type === "interview") {
      if (isStopCommand(text)) {
        await setBotState({ pending: null, interview_active: false });
        reply = "Pas de souci, on s'arrête là. Tu peux reprendre l'interview quand tu veux en tapant \"interview\".";
      } else {
        const contact = contacts.find((c) => String(c.id) === String(pending.contact_id));
        if (contact) {
          const patch = applyInterviewAnswer(contact, pending.field, text);
          await applyPatch(contact.id, patch);
          reply = "Noté pour " + (contact.first_name || "") + " ✓\n\n";
        }
        if (state.interview_active) {
          const asked = [...(state.interview_asked || []), pending.contact_id];
          const updatedContacts = await fetchAllContacts();
          const next = pickInterviewTarget(updatedContacts, []);
          if (next) {
            const question = formatInterviewQuestion(next.contact, next.field);
            await setBotState({ pending: { type: "interview", contact_id: next.contact.id, field: next.field }, interview_asked: asked });
            reply += question;
          } else {
            await setBotState({ pending: null, interview_active: false, interview_asked: [] });
            reply += "Toutes tes fiches sont plutôt bien remplies ! On reprendra plus tard s'il y a du nouveau.";
          }
        } else {
          await setBotState({ pending: null });
        }
      }
    } else if (pending.type === "disambiguate") {
      const idx = parseInt(text.trim(), 10) - 1;
      const candidate = pending.candidates[idx];
      if (candidate) {
        const contact = contacts.find((c) => String(c.id) === String(candidate.id));
        const patch = buildPatchFromFields(contact, pending.fields);
        const summary = summarizePatch(patch);
        await setBotState({ pending: { type: "confirm_update", contact_id: contact.id, patch } });
        reply = "Pour " + contact.first_name + " " + contact.last_name + " :\n" + summary + "\n\nConfirme avec OUI ?";
      } else {
        reply = "Réponds avec le numéro de la bonne personne dans la liste, ou \"annule\".";
        if (isNegative(text)) { await setBotState({ pending: null }); reply = "Ok, annulé."; }
      }
    } else if (pending.type === "confirm_update") {
      if (isAffirmative(text)) {
        await applyPatch(pending.contact_id, pending.patch);
        await setBotState({ pending: null });
        reply = "C'est enregistré ✓";
      } else if (isNegative(text)) {
        await setBotState({ pending: null });
        reply = "Ok, rien n'a été modifié.";
      } else {
        // Traiter comme une correction : ré-extraire en tenant le même contact ciblé
        const extracted = await callClaudeExtract(text, contacts.map((c) => c.first_name + " " + c.last_name));
        const contact = contacts.find((c) => String(c.id) === String(pending.contact_id));
        const patch = buildPatchFromFields(contact, extracted.fields || {});
        const summary = summarizePatch(patch);
        await setBotState({ pending: { type: "confirm_update", contact_id: contact.id, patch } });
        reply = "Compris, version corrigée :\n" + summary + "\n\nConfirme avec OUI ?";
      }
    } else if (pending.type === "confirm_create") {
      if (isAffirmative(text)) {
        const created = await createContactFromData(pending.data);
        await setBotState({ pending: null });
        reply = "Nouvelle fiche créée pour " + created.first_name + " " + created.last_name + " ✓";
      } else if (isNegative(text)) {
        await setBotState({ pending: null });
        reply = "Ok, je ne crée rien.";
      } else {
        reply = "Réponds OUI pour créer la fiche, ou NON pour annuler.";
      }
    } else if (pending.type === "confirm_prep_suggestions") {
      if (isAffirmative(text)) {
        for (const item of pending.suggestions) {
          const c = contacts.find((x) => String(x.id) === String(item.contact_id));
          if (!c) continue;
          const patch = buildPatchFromFields(c, item);
          if (Object.keys(patch).length) await applyPatch(c.id, patch);
        }
        await setBotState({ pending: null });
        reply = "Suggestions ajoutées aux fiches concernées ✓";
      } else {
        await setBotState({ pending: null });
        reply = "Ok, je ne modifie rien.";
      }
    }
    await logMessage(channel, "bot", reply);
    return reply;
  }

  // ── 2) Commandes spéciales ───────────────────────────────────────────────
  if (isInterviewTrigger(text)) {
    const target = pickInterviewTarget(contacts, []);
    if (!target) {
      reply = "Toutes tes fiches sont déjà bien remplies, bravo ! Rien à compléter pour l'instant.";
    } else {
      const question = formatInterviewQuestion(target.contact, target.field);
      await setBotState({ pending: { type: "interview", contact_id: target.contact.id, field: target.field }, interview_active: true, interview_asked: [] });
      reply = "C'est parti. " + question + "\n\n(Tape \"stop\" à tout moment pour arrêter.)";
    }
    await logMessage(channel, "bot", reply);
    return reply;
  }

  // ── 3) Extraction libre ──────────────────────────────────────────────────
  const extracted = await callClaudeExtract(text, contacts.map((c) => c.first_name + " " + c.last_name));

  if (extracted.intent === "unclear" || !extracted.intent) {
    reply = "Je n'ai pas bien saisi. Tu peux reformuler, taper \"interview\" pour que je te pose des questions, \"Préparer rencontre avec [nom]\" avant un rendez-vous, ou \"Enrichir [nom]\" pour une recherche web.";
  } else if (extracted.intent === "create_contact" && extracted.new_contact && extracted.new_contact.first_name) {
    await setBotState({ pending: { type: "confirm_create", data: extracted.new_contact } });
    reply = "Je crée une nouvelle fiche pour " + extracted.new_contact.first_name + " " + (extracted.new_contact.last_name || "") +
      (extracted.new_contact.role ? " (" + extracted.new_contact.role + ")" : "") + ". Confirme avec OUI ?";
  } else {
    const matches = findContactMatches(extracted.contact_name_guess, contacts);
    if (matches.length === 0) {
      reply = "Je ne trouve personne nommé \"" + (extracted.contact_name_guess || "?") + "\" dans ta base. Tu veux que je crée une nouvelle fiche ? (réponds OUI/NON)";
      await setBotState({ pending: { type: "confirm_create", data: { first_name: extracted.contact_name_guess || "Nouveau contact" } } });
    } else if (matches.length === 1 || matches[0].score - (matches[1] ? matches[1].score : 0) > 0.2) {
      const contact = matches[0].contact;
      const patch = buildPatchFromFields(contact, extracted.fields || {});
      if (Object.keys(patch).length === 0) {
        reply = "J'ai bien compris que ça concerne " + contact.first_name + ", mais je n'ai rien de concret à enregistrer. Peux-tu préciser ?";
      } else {
        const summary = summarizePatch(patch);
        await setBotState({ pending: { type: "confirm_update", contact_id: contact.id, patch } });
        reply = "Pour " + contact.first_name + " " + contact.last_name + " :\n" + summary + "\n\nConfirme avec OUI ?";
      }
    } else {
      const top = matches.slice(0, 4);
      const list = top.map((m, i) => (i + 1) + ". " + m.contact.first_name + " " + m.contact.last_name + (m.contact.company ? " (" + m.contact.company + ")" : "")).join("\n");
      await setBotState({ pending: { type: "disambiguate", candidates: top.map((m) => ({ id: m.contact.id })), fields: extracted.fields || {} } });
      reply = "Plusieurs personnes correspondent, laquelle ?\n" + list;
    }
  }

  await logMessage(channel, "bot", reply);
  return reply;
}

module.exports = {
  processMessage,
  transcribeAudio,
  fetchTwilioMedia,
  normalize,
  similarity,
  findContactMatches,
  completenessScore,
  pickInterviewTarget,
  formatInterviewQuestion,
  applyInterviewAnswer,
  extractMeetingPrepNames,
  extractEnrichTarget,
  searchInternalMentions,
  buildPatchFromFields,
  summarizePatch,
};
