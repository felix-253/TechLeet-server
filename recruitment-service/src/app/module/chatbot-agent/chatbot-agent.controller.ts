import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  TooManyRequestsException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AgentExecutorService } from './services/agent-executor.service';
import { SessionManagerService } from './services/session-manager.service';
import { EmbeddingIndexerService } from './services/embedding-indexer.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { AuthGuard } from '../../../common/guard/authorizationRequest.guard';
import {
  ChatRequestDto,
  ChatResponseDto,
  SessionRequestDto,
  SessionResponseDto,
  IndexTriggerDto,
  IndexResponseDto,
} from './dto/chat.dto';

@ApiTags('Chatbot Agent')
@ApiBearerAuth('token')
@UseGuards(AuthGuard)
@Controller('chatbot-agent')
export class ChatbotAgentController {
  private readonly logger = new Logger(ChatbotAgentController.name);

  constructor(
    private readonly agentExecutor: AgentExecutorService,
    private readonly sessionManager: SessionManagerService,
    private readonly embeddingIndexer: EmbeddingIndexerService,
    private readonly rateLimiter: RateLimiterService
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send message to chatbot agent',
    description: 'Send a message to the AI chatbot agent and get a response with tool execution results'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat response generated successfully',
    type: ChatResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters'
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded'
  })
  async chat(@Body() request: ChatRequestDto, @Request() req: any): Promise<ChatResponseDto> {
    if (!request.message || request.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (request.message.length > 2000) {
      throw new BadRequestException('Message too long (max 2000 characters)');
    }

    // Require authenticated user - no fallback
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User authentication required');
    }

    const userId = req.user.id;

    try {
      return await this.agentExecutor.executeAgent(request, userId);
    } catch (error) {
      if (error.message && error.message.includes('Rate limit exceeded')) {
        throw new TooManyRequestsException(error.message);
      }
      if (error instanceof BadRequestException || error instanceof UnauthorizedException || error instanceof TooManyRequestsException) {
        throw error;
      }
      this.logger.error('Chat request failed:', error);
      throw new InternalServerErrorException('An error occurred while processing your request');
    }
  }

  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get chat session details',
    description: 'Retrieve details of a specific chat session'
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: SessionResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found'
  })
  async getSession(@Param('sessionId') sessionId: string): Promise<SessionResponseDto> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      return session;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new chat session',
    description: 'Create a new chat session with optional preferences'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: SessionResponseDto
  })
  async createSession(
    @Body() request: SessionRequestDto,
    @Request() req: any
  ): Promise<SessionResponseDto> {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User authentication required');
    }

    const userId = req.user.id;

    try {
      return await this.sessionManager.createSession(userId, request);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to create session:', error);
      throw new BadRequestException('Failed to create session');
    }
  }

  @Delete('session/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete chat session',
    description: 'Delete a specific chat session'
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found'
  })
  async deleteSession(@Param('sessionId') sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.sessionManager.deleteSession(sessionId);
      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('session/:sessionId/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear session messages',
    description: 'Clear all messages from a chat session while keeping the session active'
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session messages cleared successfully'
  })
  async clearSession(@Param('sessionId') sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.sessionManager.clearSession(sessionId);
      return { success: true };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('index/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger document indexing',
    description: 'Manually trigger indexing of documents for RAG system'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Indexing triggered successfully',
    type: IndexResponseDto
  })
  async triggerIndexing(@Body() request: IndexTriggerDto): Promise<IndexResponseDto> {
    try {
      return await this.embeddingIndexer.triggerIndexing(
        request.entityTypes,
        request.forceReindex || false
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('index/stats')
  @ApiOperation({
    summary: 'Get indexing statistics',
    description: 'Get statistics about document indexing status'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Indexing statistics retrieved successfully'
  })
  async getIndexingStats(): Promise<any> {
    try {
      return await this.embeddingIndexer.getIndexingStats();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('rate-limit/status')
  @ApiOperation({
    summary: 'Get rate limit status',
    description: 'Get current rate limit status for the authenticated user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit status retrieved successfully'
  })
  async getRateLimitStatus(@Request() req: any): Promise<any> {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('User authentication required');
    }

    const userId = req.user.id;

    try {
      return await this.rateLimiter.getRateLimitStatus(userId);
    } catch (error) {
      this.logger.error('Failed to get rate limit status:', error);
      throw new InternalServerErrorException('Failed to get rate limit status');
    }
  }

  @Get('session/stats')
  @ApiOperation({
    summary: 'Get session statistics',
    description: 'Get statistics about chat sessions'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session statistics retrieved successfully'
  })
  async getSessionStats(): Promise<any> {
    try {
      return await this.sessionManager.getSessionStats();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health status of the chatbot agent service'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy'
  })
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    services: {
      agentExecutor: boolean;
      sessionManager: boolean;
      embeddingIndexer: boolean;
      rateLimiter: boolean;
    };
  }> {
    try {
      // Basic health checks
      const services = {
        agentExecutor: !!this.agentExecutor,
        sessionManager: !!this.sessionManager,
        embeddingIndexer: !!this.embeddingIndexer,
        rateLimiter: !!this.rateLimiter
      };

      const allHealthy = Object.values(services).every(status => status);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date(),
        services
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        services: {
          agentExecutor: false,
          sessionManager: false,
          embeddingIndexer: false,
          rateLimiter: false
        }
      };
    }
  }
}
