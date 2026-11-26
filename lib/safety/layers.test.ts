import { describe, expect, it } from "vitest";
import { DEMO_PROFILE } from "../profile/schema";
import { BLOCKLIST, findTerm, termRegex } from "./blocklist";
import { categoryRejection } from "./category";
import { keywordRejection } from "./filter";
import { topicKeywords } from "./topics";
import { trend } from "./test-helpers";

describe("layer 1: category allowlist", () => {
  it.each([26, 24, 23, 22, 10, 17, 15])("allows category %i", (id) => {
    expect(categoryRejection(id)).toBeNull();
  });

  it("never allows News & Politics (25) or Nonprofits & Activism (29)", () => {
    expect(categoryRejection(25)).toMatch(/News & Politics/);
    expect(categoryRejection(29)).toMatch(/Nonprofits & Activism/);
  });

  it("rejects categories that aren't on the list, like Gaming (20)", () => {
    expect(categoryRejection(20)).toMatch(/Gaming/);
  });
});

describe("layer 2: keyword blocklist", () => {
  it("includes the terms CLAUDE.md requires", () => {
    for (const t of ["death", "shooting", "assassination", "war", "attack", "crash", "disaster",
      "election", "politics", "scandal", "lawsuit", "arrest"]) {
      expect(BLOCKLIST).toContain(t);
    }
  });

  it.each([
    ["War breaks out", "war"],
    ["Top 10 WARS in history", "war"],
    ["Celebrity ARRESTED at airport", "arrest"],
    ["Highway crashes cause delays", "crash"],
    ["The election results are in", "election"],
    ["Burn This Shit Down", "shit"],
  ])("blocks %j", (title, term) => {
    expect(findTerm([title], BLOCKLIST)).toBe(term);
  });

  it.each([
    "Bakery wins award for best croissant",
    "Warm cinnamon buns on a cold morning",
    "Golden State Warriors highlights",
    "Diet Coke vs Coke taste test",
  ])("does not block the harmless title %j", (title) => {
    expect(findTerm([title], BLOCKLIST)).toBeNull();
  });

  it("errs on the side of caution: a harmless use of a blocked word is still blocked", () => {
    // Known trade-off: keywords can't read context. Losing a few harmless trends is
    // better than showing an unsafe one.
    expect(findTerm(["Attacking the weekend with pancakes"], BLOCKLIST)).toBe("attack");
  });

  it("checks tags as well as the title", () => {
    expect(findTerm(["Cute puppy compilation", "funny", "breaking news war"], BLOCKLIST)).toBe("war");
  });

  it("matches multi-word terms across spaces or hyphens", () => {
    expect(termRegex("prime minister").test("Prime-Minister speaks")).toBe(true);
    expect(termRegex("prime minister").test("prime  minister")).toBe(true);
  });
});

describe("layer 3: profile topics to avoid", () => {
  it("turns free-text topics into keywords", () => {
    const keywords = topicKeywords(["Tragedies, accidents and violence", "Gambling and betting"]).map(
      (k) => k.keyword,
    );
    expect(keywords).toEqual(["tragedy", "accident", "violence", "gambling", "betting"]);
  });

  it("keeps multi-word phrases and remembers the original topic", () => {
    const kws = topicKeywords(["Diet culture and weight-loss claims"]);
    expect(kws).toEqual([
      { keyword: "diet culture", topic: "Diet culture and weight-loss claims" },
      { keyword: "weight-loss claim", topic: "Diet culture and weight-loss claims" },
    ]);
  });

  it("rejects a trend matching the demo bakery's topics to avoid, naming the topic", () => {
    const r = keywordRejection(trend({ title: "Best sports betting tips this weekend", categoryId: 17 }),
      DEMO_PROFILE.topicsToAvoid);
    expect(r).toEqual({ layer: "profile", reason: 'Matches a topic to avoid: "Gambling and betting"' });
  });

  it("uses whatever topics the owner entered", () => {
    const item = trend({ title: "Pumpkin spice everything" });
    expect(keywordRejection(item, [])).toBeNull();
    expect(keywordRejection(item, ["Pumpkin spice"])?.layer).toBe("profile");
  });
});

describe("keywordRejection order", () => {
  it("reports the first failing layer: category before keywords", () => {
    const r = keywordRejection(trend({ title: "War news", categoryId: 25, categoryName: "News & Politics" }), []);
    expect(r?.layer).toBe("category");
  });

  it("passes a clearly harmless trend through to the LLM layer", () => {
    expect(keywordRejection(trend(), DEMO_PROFILE.topicsToAvoid)).toBeNull();
  });
});
