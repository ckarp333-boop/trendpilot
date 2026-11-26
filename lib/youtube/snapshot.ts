import rawSnapshot from "../../data/youtube-snapshot.json";
import { SnapshotSchema, type Snapshot } from "./schema";

export class SnapshotError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid YouTube snapshot: ${issues.join("; ")}`);
    this.name = "SnapshotError";
  }
}

/** Validate unknown data as a snapshot. Throws SnapshotError with readable issues. */
export function parseSnapshot(raw: unknown): Snapshot {
  const result = SnapshotSchema.safeParse(raw);
  if (!result.success) {
    throw new SnapshotError(
      result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }
  return result.data;
}

let cached: Snapshot | undefined;

/** The saved snapshot in data/youtube-snapshot.json, validated once. */
export function loadSavedSnapshot(): Snapshot {
  cached ??= parseSnapshot(rawSnapshot);
  return cached;
}
