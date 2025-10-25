import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SessionManagerService } from './session-manager.service';
import { RetrieverService } from './retriever.service';
import { RateLimiterService } from './rate-limiter.service';
import { BaseTool } from '../tools/base.tool';
import { JobPostingTool } from '../tools/job-posting.tool';
import { ApplicationTool } from '../tools/application.tool';
import { CandidateTool } from '../tools/candidate.tool';
import { AnalyticsTool } from '../tools/analytics.tool';
import { ChatRequestDto, ChatResponseDto, ChatSource, ToolCallResult } from '../dto/chat.dto';
import { DocumentEntityType } from '../../../../entities/recruitment/rag-document.entity';

export interface AgentContext {
  userId: number;
  sessionId: string;
  sessionContext: any;
  retrievedDocuments: any[];
  availableTools: BaseTool[];
}

@Injectable()
export class AgentExecutorService {
  private readonly logger = new Logger(AgentExecutorService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly defaultModel = 'gemini-2.5-flash';

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionManager: SessionManagerService,
    private readonly retriever: RetrieverService,
    private readonly rateLimiter: RateLimiterService,
    private readonly jobPostingTool: JobPostingTool,
    private readonly applicationTool: ApplicationTool,
    private readonly candidateTool: CandidateTool,
    private readonly analyticsTool: AnalyticsTool
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('Gemini API key not configured. Agent executor will not work.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }

  /**
   * Execute agent with user query
   */
  async executeAgent(request: ChatRequestDto, userId: number): Promise<ChatResponseDto> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Executing agent for user ${userId} with query: "${request.message}"`);

      // Check rate limit
      const rateLimitResult = await this.rateLimiter.checkRateLimit(userId, request.sessionId);
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`);
      }

      // Get or create session
      let session = request.sessionId 
        ? await this.sessionManager.getSession(request.sessionId)
        : null;
      
      if (!session) {
        session = await this.sessionManager.createSession(userId);
      }

      // Add user message to session
      await this.sessionManager.addMessage(session.sessionId, {
        role: 'user',
        content: request.message,
        timestamp: new Date()
      });

      // Retrieve relevant documents
      const retrievedDocuments = await this.retriever.searchWithFallback(request.message, {
        limit: 10,
        threshold: 0.7,
        filters: {
          entityTypes: this.getEntityTypesFromContext(session.context)
        }
      });

      // Build agent context
      const context: AgentContext = {
        userId,
        sessionId: session.sessionId,
        sessionContext: session.context,
        retrievedDocuments,
        availableTools: this.getAvailableTools()
      };

      // Execute agent with tools
      const result = await this.executeWithTools(request.message, context);

      // Add assistant response to session
      await this.sessionManager.addMessage(session.sessionId, {
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
        toolCalls: result.toolCalls
      });

      // Update session context if needed
      if (result.contextUpdates) {
        await this.sessionManager.updateSessionContext(session.sessionId, result.contextUpdates);
      }

      // Record request for rate limiting
      await this.rateLimiter.recordRequest(userId, session.sessionId);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Agent execution completed in ${processingTime}ms`);

      return {
        reply: result.reply,
        sessionId: session.sessionId,
        sources: result.sources,
        toolCalls: result.toolCalls
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Agent execution failed after ${processingTime}ms:`, error);
      
      // Return helpful error message
      return {
        reply: this.buildErrorMessage(error.message),
        sessionId: request.sessionId || 'error',
        sources: [],
        toolCalls: []
      };
    }
  }

  /**
   * Execute agent with tool calling
   */
  private async executeWithTools(query: string, context: AgentContext): Promise<{
    reply: string;
    sources: ChatSource[];
    toolCalls: ToolCallResult[];
    contextUpdates?: any;
  }> {
    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Build user prompt with context
      const userPrompt = this.buildUserPrompt(query, context);
      
      // Get available tools for Gemini function calling
      const tools = context.availableTools.map(tool => tool.getToolDefinition());
      
      // Call Gemini with function calling
      const model = this.genAI.getGenerativeModel({
        model: this.defaultModel,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        tools: tools.length > 0 ? tools.map(tool => ({
          functionDeclarations: [tool as any]
        })) as any : undefined
      });

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const response = await model.generateContent(fullPrompt);
      const content = response.response.text();

      // Check for function calls
      const functionCalls = response.response.functionCalls();
      let toolResults: ToolCallResult[] = [];
      let finalReply = content;

      if (functionCalls && functionCalls.length > 0) {
        // Execute tool calls
        for (const functionCall of functionCalls) {
          try {
            const tool = context.availableTools.find(t => t.name === functionCall.name);
            if (!tool) {
              this.logger.warn(`Unknown tool: ${functionCall.name}`);
              continue;
            }

            const toolResult = await tool.execute(functionCall.args, {
              userId: context.userId,
              sessionId: context.sessionId,
              sessionContext: context.sessionContext
            });

            toolResults.push({
              toolName: functionCall.name,
              parameters: functionCall.args,
              result: toolResult
            });

            // Add tool result to recent entities if applicable
            if (toolResult.success && toolResult.data) {
              await this.addRelevantEntitiesToContext(context, toolResult.data);
            }

          } catch (toolError) {
            this.logger.error(`Tool execution failed for ${functionCall.name}:`, toolError);
            toolResults.push({
              toolName: functionCall.name,
              parameters: functionCall.args,
              result: {
                success: false,
                error: toolError.message
              }
            });
          }
        }

        // Generate final response with tool results
        if (toolResults.length > 0) {
          finalReply = await this.generateFinalResponse(query, content, toolResults, context);
        }
      }

      // Format sources
      const sources: ChatSource[] = context.retrievedDocuments.map(doc => ({
        documentId: doc.documentId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        relevance: doc.similarity
      }));

      return {
        reply: finalReply,
        sources,
        toolCalls: toolResults,
        contextUpdates: this.extractContextUpdates(toolResults)
      };

    } catch (error) {
      this.logger.error('Tool execution failed:', error);
      throw error;
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(context: AgentContext): string {
    const { sessionContext } = context;
    
    return `
Bạn là AI Assistant hỗ trợ admin quản lý tuyển dụng cho TechLeet.

Vai trò của bạn:
- Trả lời câu hỏi về job postings, candidates, applications, interviews
- Tạo và cập nhật job postings theo yêu cầu
- Phân tích và tổng hợp thông tin tuyển dụng
- Hỗ trợ quyết định tuyển dụng với dữ liệu và insights

Context hiện tại:
- Focus: ${sessionContext.currentFocus}
- Các entity liên quan: ${sessionContext.recentEntityIds.join(', ') || 'Không có'}
- Ngôn ngữ: ${sessionContext.preferences.language}
- Phong cách: ${sessionContext.preferences.responseStyle}
- Bao gồm sources: ${sessionContext.preferences.includeSources ? 'Có' : 'Không'}

Nguyên tắc:
1. Trả lời bằng Markdown với formatting rõ ràng
2. Cite sources từ database khi có thể
3. Xác nhận trước khi thực hiện write operations quan trọng
4. Đề xuất actions liên quan và insights hữu ích
5. Sử dụng tools để lấy dữ liệu chính xác và cập nhật thông tin
6. Luôn cung cấp context và giải thích cho các recommendations

Available tools: ${context.availableTools.map(t => t.name).join(', ')}
    `.trim();
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(query: string, context: AgentContext): string {
    const { retrievedDocuments } = context;
    
    let prompt = `Truy vấn người dùng: ${query}\n\n`;
    
    if (retrievedDocuments.length > 0) {
      prompt += `Thông tin liên quan từ database:\n`;
      retrievedDocuments.forEach((doc, index) => {
        prompt += `${index + 1}. [${doc.entityType}] ${doc.content.substring(0, 200)}...\n`;
      });
      prompt += '\n';
    }
    
    prompt += `Hãy trả lời câu hỏi hoặc thực hiện actions cần thiết.`;
    
    return prompt;
  }

  /**
   * Generate final response with tool results
   */
  private async generateFinalResponse(
    originalQuery: string,
    initialResponse: string,
    toolResults: ToolCallResult[],
    context: AgentContext
  ): Promise<string> {
    try {
      const toolSummary = toolResults.map(result => {
        const status = result.result.success ? '✅' : '❌';
        const summary = result.result.success 
          ? `Tool ${result.toolName} executed successfully`
          : `Tool ${result.toolName} failed: ${result.result.error}`;
        return `${status} ${summary}`;
      }).join('\n');

      const prompt = `
Initial response: ${initialResponse}

Tool execution results:
${toolSummary}

Original query: ${originalQuery}

Please provide a comprehensive final response that incorporates the tool results and answers the user's question effectively. Use Markdown formatting and include relevant data from the tool results.
      `;

      const model = this.genAI.getGenerativeModel({
        model: this.defaultModel,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
        }
      });

      const response = await model.generateContent(prompt);
      return response.response.text();

    } catch (error) {
      this.logger.error('Failed to generate final response:', error);
      return initialResponse; // Fallback to initial response
    }
  }

  /**
   * Get available tools
   */
  private getAvailableTools(): BaseTool[] {
    return [
      this.jobPostingTool,
      this.applicationTool,
      this.candidateTool,
      this.analyticsTool
    ];
  }

  /**
   * Get entity types from session context
   */
  private getEntityTypesFromContext(sessionContext: any): DocumentEntityType[] {
    const focus = sessionContext.currentFocus;
    switch (focus) {
      case 'job_postings':
        return [DocumentEntityType.JOB_POSTING];
      case 'candidates':
        return [DocumentEntityType.CANDIDATE];
      case 'applications':
        return [DocumentEntityType.APPLICATION];
      case 'interviews':
        return [DocumentEntityType.INTERVIEW];
      default:
        return [DocumentEntityType.JOB_POSTING, DocumentEntityType.CANDIDATE, DocumentEntityType.APPLICATION, DocumentEntityType.INTERVIEW];
    }
  }

  /**
   * Add relevant entities to context
   */
  private async addRelevantEntitiesToContext(context: AgentContext, toolData: any): Promise<void> {
    try {
      if (toolData.jobPostingId) {
        await this.sessionManager.addRecentEntity(context.sessionId, toolData.jobPostingId);
      }
      if (toolData.applicationId) {
        await this.sessionManager.addRecentEntity(context.sessionId, toolData.applicationId);
      }
      if (toolData.candidateId) {
        await this.sessionManager.addRecentEntity(context.sessionId, toolData.candidateId);
      }
    } catch (error) {
      this.logger.error('Failed to add recent entity:', error);
    }
  }

  /**
   * Extract context updates from tool results
   */
  private extractContextUpdates(toolResults: ToolCallResult[]): any {
    const updates: any = {};
    
    // Update focus based on tool usage
    const toolNames = toolResults.map(r => r.toolName);
    if (toolNames.includes('job_posting_tool')) {
      updates.currentFocus = 'job_postings';
    } else if (toolNames.includes('application_tool')) {
      updates.currentFocus = 'applications';
    } else if (toolNames.includes('candidate_tool')) {
      updates.currentFocus = 'candidates';
    }
    
    return Object.keys(updates).length > 0 ? updates : undefined;
  }

  /**
   * Build error message
   */
  private buildErrorMessage(error: string): string {
    return `
## ❌ Lỗi xảy ra

**Lỗi:** ${error}

**Gợi ý:**
- Kiểm tra lại câu hỏi của bạn
- Thử lại sau vài giây
- Liên hệ admin nếu lỗi tiếp tục xảy ra

**Fallback:** Bạn có thể sử dụng các chức năng thủ công trong admin panel.
    `.trim();
  }
}
