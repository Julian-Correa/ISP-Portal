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
      this.redis = createClient({
        url: this.redisUrl,
        socket: {
          connectTimeout: 1000,
          reconnectStrategy: false,
        },
      });
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
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn("Redis get fallo, se usa cache en memoria:", error.message);
        this.redis = null;
      }
    }
    return this.getMemory(key);
  }

  async set(key, value, ttlSeconds) {
    if (this.redis) {
      try {
        await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.warn("Redis set fallo, se usa cache en memoria:", error.message);
        this.redis = null;
      }
    }
    this.setMemory(key, value, ttlSeconds);
  }

  async delete(key) {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (error) {
        console.warn("Redis delete fallo, se usa cache en memoria:", error.message);
        this.redis = null;
      }
    }
    this.memory.delete(key);
  }

  isRedisEnabled() {
    return Boolean(this.redis);
  }
}
