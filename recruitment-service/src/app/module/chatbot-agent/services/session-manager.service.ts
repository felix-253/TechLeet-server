import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatSessionEntity, ChatMessage, SessionContext } from '../../../../entities/recruitment/chat-session.entity';
import { SessionDto } from '../dto/session.dto';

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private readonly sessionTimeoutHours = 24;

  constructor(
    @InjectRepository(ChatSessionEntity)
    private readonly sessionRepository: Repository<ChatSessionEntity>
  ) {}

  /**
   * Create a new chat session
   */
  async createSession(userId: number, request?: any): Promise<SessionDto> {
    try {
      const context: SessionContext = {
        currentFocus: request?.focus || 'general',
        recentEntityIds: [],
        preferences: {
          language: request?.preferences?.language || 'vi',
          responseStyle: request?.preferences?.responseStyle || 'detailed',
          includeSources: request?.preferences?.includeSources ?? true
        }
      };

      const session = this.sessionRepository.create({
        userId,
        messages: [],
        context,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeoutHours * 60 * 60 * 1000)
      });

      const savedSession = await this.sessionRepository.save(session);
      
      this.logger.log(`Created new session ${savedSession.sessionId} for user ${userId}`);
      
      return this.mapToDto(savedSession);
    } catch (error) {
      this.logger.error(`Failed to create session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionDto | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId }
      });

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        this.logger.log(`Session ${sessionId} has expired, cleaning up...`);
        await this.deleteSession(sessionId);
        return null;
      }

      return this.mapToDto(session);
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<SessionDto>): Promise<void> {
    try {
      const updateData: any = {
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeoutHours * 60 * 60 * 1000)
      };

      if (updates.messages) {
        updateData.messages = updates.messages;
      }

      if (updates.context) {
        updateData.context = updates.context;
      }

      await this.sessionRepository.update(sessionId, updateData);
      this.logger.log(`Updated session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add message to session
   */
  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const updatedMessages = [...session.messages, message];
      
      await this.sessionRepository.update(sessionId, {
        messages: updatedMessages,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeoutHours * 60 * 60 * 1000)
      });

      this.logger.log(`Added message to session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to add message to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update session context
   */
  async updateSessionContext(sessionId: string, contextUpdates: Partial<SessionContext>): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const updatedContext = {
        ...session.context,
        ...contextUpdates
      };

      await this.sessionRepository.update(sessionId, {
        context: updatedContext,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeoutHours * 60 * 60 * 1000)
      });

      this.logger.log(`Updated context for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update context for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Add entity ID to recent entities
   */
  async addRecentEntity(sessionId: string, entityId: number): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const recentEntityIds = [...session.context.recentEntityIds];
      
      // Add entity ID if not already present
      if (!recentEntityIds.includes(entityId)) {
        recentEntityIds.unshift(entityId);
        // Keep only last 10 entities
        if (recentEntityIds.length > 10) {
          recentEntityIds.splice(10);
        }
      }

      await this.updateSessionContext(sessionId, { recentEntityIds });
    } catch (error) {
      this.logger.error(`Failed to add recent entity to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Clear session messages
   */
  async clearSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.update(sessionId, {
        messages: [],
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeoutHours * 60 * 60 * 1000)
      });

      this.logger.log(`Cleared messages for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to clear session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.delete(sessionId);
      this.logger.log(`Deleted session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: number): Promise<SessionDto[]> {
    try {
      const sessions = await this.sessionRepository.find({
        where: { userId },
        order: { lastActiveAt: 'DESC' }
      });

      return sessions.map(session => this.mapToDto(session));
    } catch (error) {
      this.logger.error(`Failed to get sessions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions (cron job)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const expiredSessions = await this.sessionRepository
        .createQueryBuilder('session')
        .where('session.expiresAt < :now', { now: new Date() })
        .getMany();

      if (expiredSessions.length > 0) {
        await this.sessionRepository.remove(expiredSessions);
        this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<any> {
    try {
      const totalSessions = await this.sessionRepository.count();
      const activeSessions = await this.sessionRepository.count({
        where: { expiresAt: MoreThan(new Date()) }
      });

      const userStats = await this.sessionRepository
        .createQueryBuilder('session')
        .select('session.userId, COUNT(*) as count')
        .groupBy('session.userId')
        .getRawMany();

      const avgMessagesPerSession = await this.sessionRepository
        .createQueryBuilder('session')
        .select('AVG(jsonb_array_length(session.messages)) as avgMessages')
        .getRawOne();

      return {
        totalSessions,
        activeSessions,
        expiredSessions: totalSessions - activeSessions,
        uniqueUsers: userStats.length,
        avgMessagesPerSession: parseFloat(avgMessagesPerSession.avgMessages) || 0,
        userStats: userStats.reduce((acc, stat) => {
          acc[stat.userId] = parseInt(stat.count);
          return acc;
        }, {}),
        lastUpdated: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get session statistics:', error);
      throw error;
    }
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(session: ChatSessionEntity): SessionDto {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      messages: session.messages,
      context: session.context,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    };
  }
}
