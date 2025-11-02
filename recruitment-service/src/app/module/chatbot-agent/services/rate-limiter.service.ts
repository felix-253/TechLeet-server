import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly rateLimits = new Map<string, RateLimitEntry>();
  private readonly config: RateLimitConfig = {
    requestsPerMinute: 10,
    requestsPerHour: 50,
    requestsPerDay: 200
  };

  /**
   * Check if request is allowed for user
   */
  async checkRateLimit(userId: number, sessionId?: string): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = this.getKey(userId, sessionId);
    const now = Date.now();
    
    try {
      // Clean up expired entries
      this.cleanupExpiredEntries();

      // Get or create rate limit entry
      let entry = this.rateLimits.get(key);
      if (!entry) {
        entry = {
          count: 0,
          resetTime: now + 60000, // Reset every minute
          lastRequest: now
        };
        this.rateLimits.set(key, entry);
      }

      // Check if we need to reset counters
      if (now >= entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + 60000; // Reset every minute
      }

      // Check rate limits
      const minuteLimit = this.config.requestsPerMinute;
      const hourLimit = this.config.requestsPerHour;
      const dayLimit = this.config.requestsPerDay;

      // Check minute limit
      if (entry.count >= minuteLimit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        this.logger.warn(`Rate limit exceeded for user ${userId}: ${entry.count}/${minuteLimit} requests per minute`);
        
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: entry.resetTime,
          retryAfter
        };
      }

      // Check hour limit (simplified - in production, use sliding window)
      const hourCount = this.getHourlyCount(userId);
      if (hourCount >= hourLimit) {
        this.logger.warn(`Hourly rate limit exceeded for user ${userId}: ${hourCount}/${hourLimit} requests per hour`);
        
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: now + 3600000, // Reset in 1 hour
          retryAfter: 3600
        };
      }

      // Check day limit (simplified - in production, use sliding window)
      const dayCount = this.getDailyCount(userId);
      if (dayCount >= dayLimit) {
        this.logger.warn(`Daily rate limit exceeded for user ${userId}: ${dayCount}/${dayLimit} requests per day`);
        
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: now + 86400000, // Reset in 24 hours
          retryAfter: 86400
        };
      }

      // Increment counter
      entry.count++;
      entry.lastRequest = now;

      const remainingRequests = minuteLimit - entry.count;

      this.logger.log(`Rate limit check passed for user ${userId}: ${entry.count}/${minuteLimit} requests per minute`);

      return {
        allowed: true,
        remainingRequests,
        resetTime: entry.resetTime
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for user ${userId}:`, error);
      // Allow request on error to avoid blocking legitimate users
      return {
        allowed: true,
        remainingRequests: this.config.requestsPerMinute,
        resetTime: now + 60000
      };
    }
  }

  /**
   * Record a request for rate limiting
   */
  async recordRequest(userId: number, sessionId?: string): Promise<void> {
    const key = this.getKey(userId, sessionId);
    const now = Date.now();
    
    let entry = this.rateLimits.get(key);
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + 60000,
        lastRequest: now
      };
      this.rateLimits.set(key, entry);
    }

    // Reset counter if needed
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + 60000;
    }

    entry.count++;
    entry.lastRequest = now;
  }

  /**
   * Get rate limit status for user
   */
  async getRateLimitStatus(userId: number, sessionId?: string): Promise<{
    requestsPerMinute: { used: number; limit: number; resetTime: number };
    requestsPerHour: { used: number; limit: number };
    requestsPerDay: { used: number; limit: number };
  }> {
    const key = this.getKey(userId, sessionId);
    const entry = this.rateLimits.get(key);
    const now = Date.now();

    const minuteUsed = entry ? (now < entry.resetTime ? entry.count : 0) : 0;
    const hourUsed = this.getHourlyCount(userId);
    const dayUsed = this.getDailyCount(userId);

    return {
      requestsPerMinute: {
        used: minuteUsed,
        limit: this.config.requestsPerMinute,
        resetTime: entry ? entry.resetTime : now + 60000
      },
      requestsPerHour: {
        used: hourUsed,
        limit: this.config.requestsPerHour
      },
      requestsPerDay: {
        used: dayUsed,
        limit: this.config.requestsPerDay
      }
    };
  }

  /**
   * Reset rate limit for user
   */
  async resetRateLimit(userId: number, sessionId?: string): Promise<void> {
    const key = this.getKey(userId, sessionId);
    this.rateLimits.delete(key);
    this.logger.log(`Reset rate limit for user ${userId}`);
  }

  /**
   * Get all rate limit entries (for monitoring)
   */
  async getAllRateLimits(): Promise<Map<string, RateLimitEntry>> {
    this.cleanupExpiredEntries();
    return new Map(this.rateLimits);
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(): Promise<any> {
    this.cleanupExpiredEntries();
    
    const totalEntries = this.rateLimits.size;
    const activeUsers = new Set();
    
    this.rateLimits.forEach((entry, key) => {
      const userId = this.extractUserId(key);
      activeUsers.add(userId);
    });

    return {
      totalEntries,
      activeUsers: activeUsers.size,
      config: this.config,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate key for rate limiting
   */
  private getKey(userId: number, sessionId?: string): string {
    return sessionId ? `user:${userId}:session:${sessionId}` : `user:${userId}`;
  }

  /**
   * Extract user ID from key
   */
  private extractUserId(key: string): number {
    const match = key.match(/user:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get hourly count (simplified implementation)
   */
  private getHourlyCount(userId: number): number {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    let count = 0;
    this.rateLimits.forEach((entry, key) => {
      if (key.startsWith(`user:${userId}`) && entry.lastRequest >= oneHourAgo) {
        count += entry.count;
      }
    });
    
    return count;
  }

  /**
   * Get daily count (simplified implementation)
   */
  private getDailyCount(userId: number): number {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    
    let count = 0;
    this.rateLimits.forEach((entry, key) => {
      if (key.startsWith(`user:${userId}`) && entry.lastRequest >= oneDayAgo) {
        count += entry.count;
      }
    });
    
    return count;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.rateLimits.forEach((entry, key) => {
      // Remove entries older than 1 hour
      if (now - entry.lastRequest > 3600000) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.rateLimits.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      this.logger.log(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
    }
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config.requestsPerMinute = newConfig.requestsPerMinute ?? this.config.requestsPerMinute;
    this.config.requestsPerHour = newConfig.requestsPerHour ?? this.config.requestsPerHour;
    this.config.requestsPerDay = newConfig.requestsPerDay ?? this.config.requestsPerDay;
    
    this.logger.log(`Updated rate limit configuration:`, this.config);
  }
}
