/**
 * Upstash Redis REST API Client
 * Serverless-compatible Redis client for edge functions and browser
 */

interface RedisCommand {
  command: string;
  args: (string | number)[];
}

interface RedisResponse<T = any> {
  result: T;
  error?: string;
}

export class RedisClient {
  private baseUrl: string;
  private token: string;

  constructor(url?: string, token?: string) {
    this.baseUrl = url || import.meta.env.VITE_REDIS_URL || '';
    this.token = token || import.meta.env.VITE_REDIS_TOKEN || '';
  }

  private async execute<T>(commands: RedisCommand[]): Promise<T[]> {
    if (!this.baseUrl || !this.token) {
      throw new Error('Redis credentials not configured');
    }

    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands.map(cmd => [cmd.command, ...cmd.args])),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }

    const results: RedisResponse<T>[] = await response.json();
    return results.map(r => {
      if (r.error) throw new Error(r.error);
      return r.result;
    });
  }

  async get(key: string): Promise<string | null> {
    const [result] = await this.execute<string>([
      { command: 'GET', args: [key] }
    ]);
    return result;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    const commands: RedisCommand[] = [
      { command: 'SET', args: [key, value] }
    ];
    
    if (ttlSeconds) {
      commands.push({ command: 'EXPIRE', args: [key, ttlSeconds] });
    }

    const [result] = await this.execute<string>(commands);
    return result;
  }

  async del(key: string): Promise<number> {
    const [result] = await this.execute<number>([
      { command: 'DEL', args: [key] }
    ]);
    return result;
  }

  async exists(key: string): Promise<boolean> {
    const [result] = await this.execute<number>([
      { command: 'EXISTS', args: [key] }
    ]);
    return result === 1;
  }

  async keys(pattern: string): Promise<string[]> {
    const [result] = await this.execute<string[]>([
      { command: 'KEYS', args: [pattern] }
    ]);
    return result || [];
  }

  async ttl(key: string): Promise<number> {
    const [result] = await this.execute<number>([
      { command: 'TTL', args: [key] }
    ]);
    return result;
  }

  async incr(key: string): Promise<number> {
    const [result] = await this.execute<number>([
      { command: 'INCR', args: [key] }
    ]);
    return result;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const [result] = await this.execute<number>([
      { command: 'EXPIRE', args: [key, seconds] }
    ]);
    return result;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    const [result] = await this.execute<(string | null)[]>([
      { command: 'MGET', args: keys }
    ]);
    return result;
  }

  async mset(entries: Record<string, string>): Promise<string> {
    const args = Object.entries(entries).flat();
    const [result] = await this.execute<string>([
      { command: 'MSET', args }
    ]);
    return result;
  }
}

export const redis = new RedisClient();
