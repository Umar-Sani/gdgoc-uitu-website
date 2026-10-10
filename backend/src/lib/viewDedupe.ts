// Counts a thread view at most once per client per thread per window (TODO-024).
// In-memory, per-process: resets on restart and is not shared across replicas, which is
// acceptable for a vanity counter on a single instance.

export const VIEW_DEDUPE_MS = 30 * 60 * 1000;
const VIEW_CACHE_MAX = 50_000;
const recentViews = new Map<string, number>();

export function shouldCountView(ip: string, threadId: string, now = Date.now()): boolean {
  const key = `${ip}:${threadId}`;
  const last = recentViews.get(key);
  if (last !== undefined && now - last < VIEW_DEDUPE_MS) return false;

  if (recentViews.size >= VIEW_CACHE_MAX) {
    // Evict expired entries; if the map is still full (a flood), drop the oldest half.
    for (const [k, t] of recentViews) if (now - t >= VIEW_DEDUPE_MS) recentViews.delete(k);
    if (recentViews.size >= VIEW_CACHE_MAX) {
      let n = recentViews.size / 2;
      for (const k of recentViews.keys()) { if (n-- <= 0) break; recentViews.delete(k); }
    }
  }
  recentViews.set(key, now);
  return true;
}

// Test hook.
export function _resetViewDedupe() { recentViews.clear(); }
