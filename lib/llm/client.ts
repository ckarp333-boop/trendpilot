import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const DEFAULT_TIMEOUT_MS = 30_000;

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export type LlmErrorKind = "config" | "timeout" | "rate_limit" | "refusal" | "invalid_output" | "api";

const USER_MESSAGES: Record<LlmErrorKind, string> = {
  config: "The AI service isn't set up yet. Ask the team to add an Anthropic API key.",
  timeout: "The AI took too long to respond. Please try again.",
  rate_limit: "The AI service is busy right now. Please wait a moment and try again.",
  refusal: "The AI declined this request. Try a different trend.",
  invalid_output: "The AI returned something we couldn't read. Please try again.",
  api: "Something went wrong talking to the AI service. Please try again.",
};

/** An LLM failure with a short, friendly message that is safe to show in the UI. */
export class LlmError extends Error {
  readonly userMessage: string;
  constructor(
    public readonly kind: LlmErrorKind,
    detail: string,
  ) {
    super(`LLM ${kind}: ${detail}`);
    this.name = "LlmError";
    this.userMessage = USER_MESSAGES[kind];
  }
}

export interface StructuredRequest<S extends z.ZodType> {
  schema: S;
  system: string;
  user: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
}

/** Calls the LLM and returns output validated against `schema`. Injected in tests. */
export type StructuredCaller = <S extends z.ZodType>(req: StructuredRequest<S>) => Promise<z.infer<S>>;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  // maxRetries: 1 = one retry on timeouts, 429s, 5xx and connection errors.
  client ??= new Anthropic({ maxRetries: 1, timeout: DEFAULT_TIMEOUT_MS });
  return client;
}

/**
 * One structured-output call to Claude. Server-side only (reads ANTHROPIC_API_KEY).
 * Uses server-side refusal fallbacks, a timeout, and zod validation of the result.
 * Throws LlmError on any failure.
 */
export const callStructured: StructuredCaller = async (req) => {
  try {
    const res = await getClient().beta.messages.parse(
      {
        model: getModel(),
        max_tokens: req.maxTokens ?? 2048,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        output_config: {
          effort: req.effort ?? "low",
          format: betaZodOutputFormat(req.schema),
        },
      },
      { timeout: req.timeoutMs ?? DEFAULT_TIMEOUT_MS },
    );

    if (res.stop_reason === "refusal") {
      throw new LlmError("refusal", res.stop_details?.category ?? "no category");
    }
    if (res.stop_reason === "max_tokens") {
      throw new LlmError("invalid_output", "response hit max_tokens");
    }
    const checked = req.schema.safeParse(res.parsed_output);
    if (!checked.success) {
      throw new LlmError("invalid_output", checked.error.message);
    }
    return checked.data;
  } catch (err) {
    throw toLlmError(err);
  }
};

export function toLlmError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new LlmError("timeout", err.message);
  if (err instanceof Anthropic.AuthenticationError) return new LlmError("config", err.message);
  if (err instanceof Anthropic.PermissionDeniedError) return new LlmError("config", err.message);
  if (err instanceof Anthropic.RateLimitError) return new LlmError("rate_limit", err.message);
  if (err instanceof Anthropic.APIError) return new LlmError("api", err.message);
  if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message)) {
    return new LlmError("config", err.message);
  }
  return new LlmError("invalid_output", err instanceof Error ? err.message : String(err));
}
