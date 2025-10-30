import { Logger } from '@nestjs/common';

export interface CircuitBreakerConfig {
   failureThreshold?: number;
   successThreshold?: number;
   timeout?: number;
   resetTimeout?: number;
}

export class CircuitBreakerUtil {
   private static readonly logger = new Logger('CircuitBreaker');

   private state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
   };

   private readonly config: Required<CircuitBreakerConfig>;

   constructor(config: CircuitBreakerConfig = {}) {
      this.config = {
         failureThreshold: config.failureThreshold || 5,
         successThreshold: config.successThreshold || 2,
         timeout: config.timeout || 60000,
         resetTimeout: config.resetTimeout || 60000,
      };
   }

   /**
    * Execute an operation with circuit breaker pattern
    */
   async execute<T>(operation: () => Promise<T>, operationName: string = 'operation'): Promise<T> {
      // Check if circuit is open
      if (this.state.isOpen) {
         const timeSinceLastFailure = Date.now() - this.state.lastFailureTime;
         if (timeSinceLastFailure < this.config.resetTimeout) {
            CircuitBreakerUtil.logger.warn(`${operationName}: Circuit is OPEN. Request rejected.`);
            throw new Error(`Circuit breaker is open. Too many failures.`);
         } else {
            // Circuit can transition to half-open
            CircuitBreakerUtil.logger.log(`${operationName}: Circuit breaker resetting to HALF-OPEN`);
            this.state.isOpen = false;
            this.state.successCount = 0;
         }
      }

      try {
         // Execute the operation
         const result = await this.executeWithTimeout(
            operation,
            this.config.timeout,
            operationName
         );

         // Success - close circuit if it was half-open
         if (this.state.isOpen) {
            this.state.successCount++;
            if (this.state.successCount >= this.config.successThreshold) {
               CircuitBreakerUtil.logger.log(`${operationName}: Circuit breaker closed after ${this.config.successThreshold} successful attempts`);
               this.state.isOpen = false;
               this.state.failureCount = 0;
            }
         }

         return result;
      } catch (error) {
         // Failure - increment failure count
         this.state.failureCount++;
         this.state.lastFailureTime = Date.now();

         CircuitBreakerUtil.logger.error(`${operationName}: Operation failed (failure count: ${this.state.failureCount})`);

         // Open circuit if threshold reached
         if (this.state.failureCount >= this.config.failureThreshold) {
            this.state.isOpen = true;
            CircuitBreakerUtil.logger.error(`${operationName}: Circuit breaker opened after ${this.state.failureCount} failures`);
         }

         throw error;
      }
   }

   /**
    * Execute operation with timeout
    */
   private async executeWithTimeout<T>(
      operation: () => Promise<T>,
      timeoutMs: number,
      operationName: string
   ): Promise<T> {
      return Promise.race([
         operation(),
         new Promise<T>((_, reject) =>
            setTimeout(() => {
               reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
            }, timeoutMs)
         ),
      ]);
   }

   /**
    * Get current circuit state
    */
   getState() {
      return {
         isOpen: this.state.isOpen,
         failureCount: this.state.failureCount,
         successCount: this.state.successCount,
         lastFailureTime: this.state.lastFailureTime,
      };
   }

   /**
    * Manually reset the circuit breaker
    */
   reset() {
      this.state.isOpen = false;
      this.state.failureCount = 0;
      this.state.successCount = 0;
      this.state.lastFailureTime = 0;
      CircuitBreakerUtil.logger.log('Circuit breaker manually reset');
   }
}

