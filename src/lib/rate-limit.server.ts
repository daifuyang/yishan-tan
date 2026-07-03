import { Errors } from "./errors";
import { getRedis } from "./redis.server";

export type RateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowSec: number;
};

export async function rateLimit({
  bucket,
  key,
  limit,
  windowSec,
}: RateLimitOptions): Promise<{ allowed: true } | { allowed: false; resetAt: number }> {
  const redis = getRedis();
  const redisKey = `rl:${bucket}:${key}`;
  const result = await redis.incr(redisKey);
  if (result === 1) {
    await redis.expire(redisKey, windowSec);
  }
  if (result > limit) {
    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + Math.max(ttl, 0) * 1000;
    return { allowed: false, resetAt };
  }
  return { allowed: true };
}

export function enforceRateLimitOrThrow(outcome: Awaited<ReturnType<typeof rateLimit>>) {
  if (!outcome.allowed) throw Errors.rateLimited(outcome.resetAt);
}
