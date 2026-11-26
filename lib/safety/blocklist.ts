/**
 * Layer 2: keyword blocklist. Matched against a trend's title and tags as whole words
 * (case-insensitive), with simple plural/verb endings, so "war" blocks "wars" but not
 * "award", "warm" or "Warriors".
 */
export const BLOCKLIST: readonly string[] = [
  // Violence and tragedy
  "death", "dead", "die", "died", "dying", "kill", "killed", "killing", "murder", "shooting",
  "shooter", "shot dead", "gun", "guns", "weapon", "stabbing", "assassination", "assassinate",
  "war", "attack", "terror", "terrorist", "bomb", "explosive", "explosion", "missile", "army",
  "military", "invasion", "hostage", "massacre", "genocide", "crash", "disaster", "tragedy",
  "tragic", "victim", "funeral", "earthquake", "hurricane", "wildfire", "flood", "overdose",
  "suicide", "abuse", "injured", "fatal",
  // Politics and current affairs
  "election", "elections", "politics", "political", "politician", "president", "prime minister",
  "senator", "congress", "parliament", "government", "democrat", "republican", "liberal party",
  "conservative party", "trump", "biden", "putin", "tariff", "protest", "riot", "immigration",
  "abortion",
  // Legal trouble and scandal
  "scandal", "lawsuit", "sued", "arrest", "arrested", "jail", "prison", "indicted", "charged with",
  "fraud", "allegation", "allegations",
  // Profanity (family-friendly brand)
  "shit", "fuck", "fucking", "bitch", "bullshit",
];

const SUFFIXES = "(?:s|es|ed|d|ing)?";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a whole-word, case-insensitive matcher. Spaces and hyphens in a term match either. */
export function termRegex(term: string): RegExp {
  const body = term
    .trim()
    .split(/[\s-]+/)
    .map(escapeRegex)
    .join("[\\s-]+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${SUFFIXES}(?![\\p{L}\\p{N}])`, "iu");
}

const compiled = new Map<string, RegExp>();
function cachedRegex(term: string): RegExp {
  let re = compiled.get(term);
  if (!re) {
    re = termRegex(term);
    compiled.set(term, re);
  }
  return re;
}

/** The first term found in any of the texts, or null. */
export function findTerm(texts: readonly string[], terms: readonly string[]): string | null {
  for (const term of terms) {
    const re = cachedRegex(term);
    if (texts.some((t) => re.test(t))) return term;
  }
  return null;
}
