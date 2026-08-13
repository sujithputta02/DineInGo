import { createClient, RedisClientType } from 'redis';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private readonly DEFAULT_TTL = parseInt(process.env.REDIS_TTL || '300'); // 5 minutes
  private readonly enabled = process.env.REDIS_ENABLED === 'true';

  async connect(): Promise<void> {
    if (!this.enabled) {
      console.log('⚠️  Redis caching is disabled (REDIS_ENABLED=false)');
      return;
    }

    if (this.isConnected) {
      console.log('✅ Redis already connected');
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        console.warn('⚠️  REDIS_URL not configured. Caching disabled.');
        return;
      }

      console.log('🔌 Connecting to Redis...');

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error('❌ Redis connection failed after 3 retries');
              return new Error('Max retries reached');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 Redis reconnect attempt ${retries} (delay: ${delay}ms)`);
            return delay;
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔌 Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connected and ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.isConnected = false;
      });

      await this.client.connect();

      // Test connection
      await this.client.ping();
      console.log('✅ Redis connection verified (PING successful)');
      
    } catch (error: any) {
      console.error('❌ Redis connection error:', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.isConnected || !this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error: any) {
      console.error(`Redis GET error for key "${key}":`, error.message);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.enabled || !this.isConnected || !this.client) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl || this.DEFAULT_TTL, serialized);
      return true;
    } catch (error: any) {
      console.error(`Redis SET error for key "${key}":`, error.message);
      return false;
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.enabled || !this.isConnected || !this.client) return;

    try {
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await this.client.del(key);
        }
      } else {
        await this.client.del(key);
      }
    } catch (error: any) {
      console.error('Redis DEL error:', error.message);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.isConnected || !this.client) return;

    try {
      // Use SCAN instead of KEYS for better performance
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await this.client.scan(cursor.toString(), {
          MATCH: pattern,
          COUNT: 100
        });
        cursor = parseInt(result.cursor.toString());
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️  Invalidated ${keys.length} cache keys matching "${pattern}"`);
      }
    } catch (error: any) {
      console.error('Redis INVALIDATE error:', error.message);
    }
  }

  async flushAll(): Promise<void> {
    if (!this.enabled || !this.isConnected || !this.client) return;

    try {
      await this.client.flushAll();
      console.log('✅ Redis cache cleared (FLUSHALL)');
    } catch (error: any) {
      console.error('Redis FLUSH error:', error.message);
    }
  }

  isReady(): boolean {
    return this.enabled && this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('✅ Redis disconnected gracefully');
      } catch (error) {
        console.error('Error disconnecting Redis:', error);
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  // Stats for monitoring
  async getStats(): Promise<any> {
    if (!this.isReady() || !this.client) {
      return { enabled: false };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();
      
      return {
        enabled: true,
        connected: this.isConnected,
        keysCount: dbSize,
        uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1] || 'unknown',
        stats: info
      };
    } catch (error) {
      return { enabled: true, connected: false, error: 'Failed to get stats' };
    }
  }
}

export const cacheService = new CacheService();
