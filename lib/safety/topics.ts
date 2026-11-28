/**
 * Layer 3 (keyword part): turn the profile's free-text "topics to avoid" into keywords.
 * "Tragedies, accidents and violence" -> tragedy, accident, violence.
 * The LLM layer handles meaning; this layer catches the obvious words cheaply.
 */

const STOPWORDS = new Set(["a", "an", "the", "of", "about", "any", "all", "other", "etc"]);

/** Words that end in "s" but aren't plurals: stripping the s would turn "news" into "new". */
const NOT_PLURAL = new Set([
  "news", "lens", "series", "species", "chaos", "bias", "gas", "diabetes", "herpes", "measles",
  "mumps", "rabies", "scabies", "thanks", "always", "perhaps", "canvas", "atlas", "christmas",
]);

function singular(word: string): string {
  if (NOT_PLURAL.has(word.toLowerCase())) return word;
  if (/ies$/i.test(word)) return word.slice(0, -3) + "y";
  if (/(ss|us|is)$/i.test(word)) return word;
  if (/s$/i.test(word) && word.length > 3) return word.slice(0, -1);
  return word;
}

export interface TopicKeyword {
  keyword: string;
  /** The profile topic this keyword came from, shown in the "Filtered out" reason. */
  topic: string;
}

export function topicKeywords(topicsToAvoid: readonly string[]): TopicKeyword[] {
  const out: TopicKeyword[] = [];
  const seen = new Set<string>();

  for (const topic of topicsToAvoid) {
    const fragments = topic
      .toLowerCase()
      .split(/,|;|\/|\band\b|\bor\b|&/)
      .map((f) => f.trim())
      .filter(Boolean);

    for (const fragment of fragments) {
      const words = fragment.split(/\s+/).filter((w) => !STOPWORDS.has(w));
      if (words.length === 0) continue;
      // Singularise the last word so the matcher's plural suffix covers both forms.
      words[words.length - 1] = singular(words[words.length - 1]);
      const keyword = words.join(" ");
      if (keyword.length < 3 || seen.has(keyword)) continue;
      seen.add(keyword);
      out.push({ keyword, topic });
    }
  }
  return out;
}
