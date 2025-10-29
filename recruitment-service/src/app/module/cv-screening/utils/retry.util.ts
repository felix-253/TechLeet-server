import { Logger } from '@nestjs/common';

export interface RetryOptions {
   maxAttempts?: number;
   baseDelayMs?: number;
   maxDelayMs?: number;
   shouldRetry?: (error: any) => boolean;
   onRetry?: (attempt: number, error: Error) => void;
}

export class RetryUtil {
   private static readonly logger = new Logger('RetryUtil');

   /**
    * Execute an async operation with exponential backoff retry logic
    */
   static async executeWithRetry<T>(
      operation: () => Promise<T>,
      options: RetryOptions = {}
   ): Promise<T> {
      const {
         maxAttempts = 3,
         baseDelayMs = 1000,
         maxDelayMs = 10000,
         shouldRetry = () => true,
         onRetry,
      } = options;

      let lastError: Error = new Error('Operation failed: no attempts made');

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try {
            const result = await operation();
            if (attempt > 1) {
               this.logger.log(`Operation succeeded on attempt ${attempt}`);
            }
            return result;
         } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            if (attempt === maxAttempts || !shouldRetry(error)) {
               this.logger.error(`Operation failed permanently after ${attempt} attempts: ${lastError.message}`);
               break;
            }

            // Calculate backoff delay with jitter
            const delay = Math.min(
               baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
               maxDelayMs
            );

            this.logger.warn(`Operation failed on attempt ${attempt}/${maxAttempts}: ${error.message}. Retrying in ${Math.round(delay)}ms...`);

            if (onRetry) {
               onRetry(attempt, error as Error);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
         }
      }

      throw lastError;
   }

   /**
    * Calculate exponential backoff delay with jitter
    */
   private static calculateBackoffDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 10000): number {
      return Math.min(
         baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
         maxDelay
      );
   }
}

