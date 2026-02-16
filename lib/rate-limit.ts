/**
 * In-memory sliding window rate limiter.
 *
 * Tracks request timestamps per IP address. When a new request arrives,
 * it removes expired timestamps (outside the window) and checks if the
 * remaining count exceeds the limit.
 *
 * IMPORTANT: This is a learning exercise. In production on Vercel, each
 * serverless function invocation gets its own memory -- this Map won't
 * be shared across instances or survive cold starts. For production,
 * use Upstash Redis (see Step 5.8 for details).
 */

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000; // 60 seconds

// Map of IP address -> array of request timestamps (in milliseconds)
const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];

  // Remove timestamps that are outside the current window.
  // Only keep requests from the last WINDOW_MS milliseconds.
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  // If this IP has hit the limit, reject the request
  if (recentTimestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = recentTimestamps[0];
    // Tell the client how long to wait before the oldest request
    // "falls out" of the window, freeing up a slot
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
    return { allowed: false, retryAfterMs };
  }

  // Request is allowed -- record the timestamp
  recentTimestamps.push(now);
  requestLog.set(ip, recentTimestamps);
  return { allowed: true };
}

/**
 * Clear all rate limit data. Exported for use in tests --
 * each test should start with a clean slate so rate limit
 * state from one test doesn't affect another.
 */
export function resetRateLimiter(): void {
  requestLog.clear();
}
