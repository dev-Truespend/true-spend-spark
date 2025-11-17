import { createHmac } from 'node:crypto';

export class WebhookValidator {
  /**
   * Verify Resend webhook signature
   * https://resend.com/docs/api-reference/webhooks/verify-signature
   */
  static verifyResendSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const hmac = createHmac('sha256', secret);
      const expectedSignature = hmac.update(payload).digest('hex');
      return signature === expectedSignature;
    } catch (error) {
      console.error('Resend signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify Twilio webhook signature (for future MessageBird integration)
   * https://www.twilio.com/docs/usage/security#validating-requests
   */
  static verifyTwilioSignature(
    url: string,
    params: Record<string, string>,
    signature: string,
    authToken: string
  ): boolean {
    try {
      // Sort params alphabetically
      const sortedKeys = Object.keys(params).sort();
      
      // Concatenate URL with sorted params
      let data = url;
      for (const key of sortedKeys) {
        data += key + params[key];
      }

      // Create HMAC-SHA1
      const hmac = createHmac('sha1', authToken);
      const expectedSignature = hmac.update(data).digest('base64');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Twilio signature verification error:', error);
      return false;
    }
  }

  /**
   * Check if event is a replay attack (timestamp-based)
   * Rejects events older than 5 minutes
   */
  static isReplayAttack(timestamp: number, maxAgeSeconds: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;
    return age > maxAgeSeconds || age < 0;
  }

  /**
   * Check if IP is in whitelist (optional security layer)
   */
  static checkIPWhitelist(ip: string, source: string): boolean {
    const whitelists: Record<string, string[]> = {
      resend: [
        // Resend IP ranges (update as needed)
        '35.198.0.0/16',
        '34.198.0.0/16',
      ],
      twilio: [
        // Twilio IP ranges (update as needed)
        '54.172.60.0/23',
        '54.244.51.0/24',
      ],
    };

    const whitelist = whitelists[source];
    if (!whitelist) {
      return true; // No whitelist defined, allow all
    }

    // Simple IP check (for exact matches)
    // In production, implement CIDR range checking
    return whitelist.some(range => {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const baseIp = range.split('/')[0];
        return ip.startsWith(baseIp.split('.').slice(0, 2).join('.'));
      }
      return ip === range;
    });
  }

  /**
   * Generate idempotency key from event data
   */
  static generateIdempotencyKey(eventId: string, source: string): string {
    return `${source}_${eventId}`;
  }

  /**
   * Check if event has already been processed (idempotency)
   */
  static async checkIdempotency(
    supabase: any,
    eventId: string,
    source: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('source', source)
      .eq('payload->>id', eventId)
      .eq('processed', true)
      .limit(1);

    if (error) {
      console.error('Idempotency check error:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Rate limit check by IP address
   */
  static async checkRateLimit(
    supabase: any,
    ip: string,
    source: string,
    maxRequests: number = 100,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number }> {
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { data, error } = await supabase
      .from('webhook_events')
      .select('id', { count: 'exact' })
      .eq('source', source)
      .eq('ip_address', ip)
      .gte('created_at', windowStart);

    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: maxRequests };
    }

    const count = data?.length || 0;
    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return { allowed, remaining };
  }
}
