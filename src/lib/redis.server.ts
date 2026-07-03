import IORedis from "ioredis";

let _redis: IORedis | undefined;

export function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is not set");
    }
    _redis = new IORedis(url, { lazyConnect: false });
  }
  return _redis;
}
