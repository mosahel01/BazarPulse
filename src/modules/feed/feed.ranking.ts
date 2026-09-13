export interface RankInput {
  upvotes: number;
  downvotes: number;
  comments: number;
  createdAt: Date | string;
}

export interface RankOutput {
  score: number;
  ageHours: number;
  recencyBonus: number;
}

/**
 * Deterministic feed ranking:
 *
 *   score = upvotes * 2
 *         + comments * 1.5
 *         + recencyBonus
 *         - downvotes * 1
 *
 *   where recencyBonus = 20 / (ageHours + 2)
 *
 * Engagement dominates, with a smooth time-decay term so fresh posts start
 * with a modest head start and old posts decay gently rather than dropping
 * out instantly. Pure and deterministic — same inputs always yield the same
 * score — which keeps pagination stable across requests.
 */
export function rankPost(input: RankInput, now: Date = new Date()): RankOutput {
  const createdAt = new Date(input.createdAt).getTime();
  const ageHours = Math.max(0, (now.getTime() - createdAt) / 3_600_000);
  const recencyBonus = 20 / (ageHours + 2);
  const score = input.upvotes * 2 + input.comments * 1.5 + recencyBonus - input.downvotes;
  return { score, ageHours, recencyBonus };
}

export function compareRanked<T extends RankInput>(a: T, b: T, now?: Date): number {
  const scoreA = rankPost(a, now).score;
  const scoreB = rankPost(b, now).score;
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export const FEED_SORTS = ['latest', 'top'] as const;
export type FeedSort = (typeof FEED_SORTS)[number];