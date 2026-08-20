/**
 * Deterministic claim extraction from last_assistant_message.
 * Regex/heuristics only — no I/O, no Kane, no LLM. Fail toward [].
 */

const HIGH_VERBS = [
  "added",
  "fixed",
  "implemented",
  "created",
  "wired",
  "removed",
  "renamed",
  "enabled",
  "disabled",
  "now works",
  "now shows",
];

const LOW_VERBS = ["updated", "should now"];

const ALL_VERBS = [...HIGH_VERBS, ...LOW_VERBS];

const DISCARD_PREFIX =
  /^(if|consider|you can|next|i'll|i will|i am going to|i'm going to|let's|we should|you should)\b/i;

function verbRe(verb) {
  const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if (verb.includes(" ")) return new RegExp(`\\b${escaped}\\b`, "i");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

const VERB_MATCHERS = ALL_VERBS.map((verb) => ({
  verb,
  re: verbRe(verb),
  confidence: HIGH_VERBS.includes(verb) ? "high" : "low",
  strength: HIGH_VERBS.includes(verb) ? 2 : 1,
}));

export function stripMarkdown(input) {
  if (typeof input !== "string") return "";
  let t = input;
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]*)`/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/_([^_]+)_/g, "$1");
  t = t.replace(/~~([^~]+)~~/g, "$1");
  t = t.replace(/^\s*[-*+]\s+/gm, "");
  t = t.replace(/^\s*\d+\.\s+/gm, "");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{2,}/g, "\n");
  return t.trim();
}

function splitSentences(text) {
  const chunks = text
    .split(/(?<=[.!?])\s+|\n+| — | – /)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const chunk of chunks) {
    const parts = chunk.split(/\s+and\s+/i);
    if (parts.length >= 2 && parts.filter((p) => hasCompletionVerb(p)).length >= 2) {
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed) out.push(trimmed);
      }
    } else {
      out.push(chunk);
    }
  }
  return out;
}

function hasCompletionVerb(s) {
  return VERB_MATCHERS.some((m) => m.re.test(s));
}

function matchVerb(s) {
  let best = null;
  for (const m of VERB_MATCHERS) {
    if (!m.re.test(s)) continue;
    if (!best || m.strength > best.strength) best = m;
  }
  return best;
}

function isQuestion(s) {
  const t = s.trim();
  if (t.endsWith("?")) return true;
  return /^(who|what|when|where|why|how|is|are|do|does|did|can|could|would|should|will)\b/i.test(t);
}

function normalizeSentence(s) {
  let t = s.replace(/\s+/g, " ").trim();
  t = t.replace(/^[-*+]+\s*/, "");
  t = t.replace(/^done\s*[—–:-]\s*/i, "");
  if (t && !/[.!?]$/.test(t)) t += ".";
  return t;
}

function isDiscard(s) {
  const t = s.trim();
  if (isQuestion(t)) return true;
  if (DISCARD_PREFIX.test(t)) return true;
  return false;
}

/**
 * @param {unknown} lastAssistantMessage
 * @returns {{ text: string, verb: string, confidence: 'high'|'low' }[]}
 */
export function extractClaims(lastAssistantMessage) {
  try {
    if (typeof lastAssistantMessage !== "string" || !lastAssistantMessage.trim()) return [];
    const plain = stripMarkdown(lastAssistantMessage);
    if (!plain) return [];
    const sentences = splitSentences(plain);
    const scored = [];
    for (let i = 0; i < sentences.length; i++) {
      const raw = sentences[i];
      if (isDiscard(raw)) continue;
      const matched = matchVerb(raw);
      if (!matched) continue;
      const text = normalizeSentence(raw);
      if (text.length < 15 || text.length > 280) continue;

      // Reported speech is not a claim. "It says it is fixed" describes the
      // agent rather than asserting anything, and prosecuting it produces a
      // test about the narration instead of the product.
      if (/\b(says?|said|claims?|claimed|reports?)\b/i.test(raw)) continue;

      // A heading is not a claim. "Fixed three ways:" and "What I changed:"
      // announce what follows; prosecuting one produces a test about nothing,
      // authored against whatever the browser happened to be showing.
      if (/[:;]$/.test(text)) continue;

      // A claim needs an object, not just a verb and a quantity. "Fixed three
      // ways" names nothing a browser could go and look at.
      const after = text.slice(text.toLowerCase().indexOf(matched.verb) + matched.verb.length);
      if (!/[a-z]{3,}/i.test(after.replace(/\b(one|two|three|four|five|six|ways?|times?|things?|bugs?|issues?|places?)\b/gi, ""))) {
        continue;
      }
      scored.push({
        text,
        verb: matched.verb,
        confidence: matched.confidence,
        _rank: matched.strength * 1000 - i,
      });
    }
    scored.sort((a, b) => b._rank - a._rank);
    return scored.slice(0, 3).map(({ text, verb, confidence }) => ({ text, verb, confidence }));
  } catch {
    return [];
  }
}
