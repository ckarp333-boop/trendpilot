import { categoryName, SAFE_CATEGORY_IDS } from "../youtube/categories";

const SAFE = new Set<number>(SAFE_CATEGORY_IDS);

/** Layer 1: category allowlist. Returns a reason if the category isn't allowed, else null. */
export function categoryRejection(categoryId: number): string | null {
  if (SAFE.has(categoryId)) return null;
  return `Category "${categoryName(categoryId)}" is not on the safe list`;
}
