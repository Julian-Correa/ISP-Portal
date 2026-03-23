import { createClient } from "redis";

export class CacheClient {
  constructor({ redisUrl }) {
    this.redisUrl = redisUrl;
    this.redis = null;
    this.memory = new Map();
  }

  async connect() {
    if (!this.redisUrl) return;

    try {
      this.redis = createClient({ url: this.redisUrl });
      this.redis.on("error", (err) => {
        console.warn("Redis no disponible, se usa caché en memoria:", err.message);
      });
      await this.redis.connect();
      console.log("Redis conectado");
    } catch (error) {
      console.warn("No se pudo conectar Redis, se usa caché en memoria:", error.message);
      this.redis = null;
    }
  }

  setMemory(key, value, ttlSeconds) {
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  getMemory(key) {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async get(key) {
    if (this.redis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    }
    return this.getMemory(key);
  }

  async set(key, value, ttlSeconds) {
    if (this.redis) {
      await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    }
    this.setMemory(key, value, ttlSeconds);
  }

  isRedisEnabled() {
    return Boolean(this.redis);
  }
}
