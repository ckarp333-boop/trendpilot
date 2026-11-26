import { beforeEach, describe, expect, it, vi } from "vitest";
import { LlmError } from "@/lib/llm/client";

const getConceptsForTrend = vi.fn();
vi.mock("@/lib/generate", () => ({ getConceptsForTrend: (...args: unknown[]) => getConceptsForTrend(...args) }));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  getConceptsForTrend.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/generate", () => {
  it("returns concepts for a safe trend", async () => {
    getConceptsForTrend.mockResolvedValue({
      concepts: [{ hook: "h" }],
      source: "cache",
      trend: { id: "a", url: "https://www.youtube.com/watch?v=a", categoryName: "Music" },
    });
    const res = await post({ trendId: "a" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("cache");
    expect(json.trend.url).toContain("youtube.com");
  });

  it("rejects a malformed body with 400", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ trendId: "" })).status).toBe(400);
    expect((await post({ trendId: "a", profile: { businessName: "x" } })).status).toBe(400);
  });

  it("returns 404 for a trend that isn't on the safe list", async () => {
    getConceptsForTrend.mockResolvedValue(null);
    const res = await post({ trendId: "unsafe" });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/safe list/);
  });

  it.each([
    ["timeout", 504, /took too long/],
    ["invalid_output", 502, /couldn't read/],
    ["rate_limit", 429, /busy/],
    ["config", 503, /isn't set up/],
  ] as const)("maps an LLM %s to %i with a friendly message", async (kind, status, message) => {
    getConceptsForTrend.mockRejectedValue(new LlmError(kind, "details that stay in the server log"));
    const res = await post({ trendId: "a" });
    expect(res.status).toBe(status);
    const json = await res.json();
    expect(json.error).toMatch(message);
    expect(JSON.stringify(json)).not.toContain("details that stay in the server log");
  });

  it("hides unexpected errors behind a generic message", async () => {
    getConceptsForTrend.mockRejectedValue(new Error("ENOENT secret path"));
    const res = await post({ trendId: "a" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("ENOENT");
  });
});
