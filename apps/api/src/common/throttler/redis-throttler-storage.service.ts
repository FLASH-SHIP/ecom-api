import { getRedisClient } from "@flash-ship/ecom-lib/redis";
import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = getRedisClient();
    const redisKey = `throttler:${key}:${throttlerName}`;
    const now = Date.now();

    const raw = await redis.get(redisKey);
    let record: {
      totalHits: number;
      expiresAt: number;
      blockExpiresAt: number;
      isBlocked: boolean;
    };

    if (raw) {
      try {
        record = JSON.parse(raw);
      } catch {
        record = {
          totalHits: 0,
          expiresAt: now + ttl,
          blockExpiresAt: 0,
          isBlocked: false,
        };
      }
    } else {
      record = {
        totalHits: 0,
        expiresAt: now + ttl,
        blockExpiresAt: 0,
        isBlocked: false,
      };
    }

    let timeToExpire = Math.ceil((record.expiresAt - now) / 1000);

    if (timeToExpire <= 0) {
      record.expiresAt = now + ttl;
      record.totalHits = 0;
      timeToExpire = Math.ceil(ttl / 1000);
    }

    let timeToBlockExpire = 0;
    if (record.isBlocked) {
      timeToBlockExpire = Math.ceil((record.blockExpiresAt - now) / 1000);
      if (timeToBlockExpire <= 0) {
        record.isBlocked = false;
        record.totalHits = 0;
        record.blockExpiresAt = 0;
        timeToBlockExpire = 0;
      }
    }

    if (!record.isBlocked) {
      record.totalHits += 1;
      if (record.totalHits > limit) {
        record.isBlocked = true;
        record.blockExpiresAt = now + blockDuration;
        timeToBlockExpire = Math.ceil(blockDuration / 1000);
      }
    }

    const maxDurationMs = Math.max(ttl, blockDuration);
    const redisTtlSeconds = Math.ceil(maxDurationMs / 1000) + 10;
    await redis.set(redisKey, JSON.stringify(record), "EX", redisTtlSeconds);

    return {
      totalHits: record.totalHits,
      timeToExpire,
      isBlocked: record.isBlocked,
      timeToBlockExpire,
    };
  }
}
