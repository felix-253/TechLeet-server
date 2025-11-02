import { Injectable, Logger } from '@nestjs/common';
import { AgentExecutorService } from './services/agent-executor.service';
import { SessionManagerService } from './services/session-manager.service';
import { EmbeddingIndexerService } from './services/embedding-indexer.service';
import { RetrieverService } from './services/retriever.service';
import { RateLimiterService } from './services/rate-limiter.service';

@Injectable()
export class ChatbotAgentService {
  private readonly logger = new Logger(ChatbotAgentService.name);

  constructor(
    private readonly agentExecutor: AgentExecutorService,
    private readonly sessionManager: SessionManagerService,
    private readonly embeddingIndexer: EmbeddingIndexerService,
    private readonly retriever: RetrieverService,
    private readonly rateLimiter: RateLimiterService
  ) {}

  /**
   * Get service statistics
   */
  async getServiceStats(): Promise<any> {
    try {
      const [sessionStats, indexingStats, retrievalStats, rateLimitStats] = await Promise.all([
        this.sessionManager.getSessionStats(),
        this.embeddingIndexer.getIndexingStats(),
        this.retriever.getRetrievalStats(),
        this.rateLimiter.getRateLimitStats()
      ]);

      return {
        sessions: sessionStats,
        indexing: indexingStats,
        retrieval: retrievalStats,
        rateLimiting: rateLimitStats,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get service stats:', error);
      throw error;
    }
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing ChatbotAgentService...');
      
      // Perform any initialization tasks
      await this.embeddingIndexer.getIndexingStats();
      
      this.logger.log('ChatbotAgentService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChatbotAgentService:', error);
      throw error;
    }
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Cleaning up ChatbotAgentService...');
      
      // Perform any cleanup tasks
      this.logger.log('ChatbotAgentService cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup ChatbotAgentService:', error);
    }
  }
}
