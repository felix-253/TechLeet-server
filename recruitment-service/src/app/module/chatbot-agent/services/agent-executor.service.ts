import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyServiceClient } from '../../analytics/company-service.client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SessionManagerService } from './session-manager.service';
import { RetrieverService } from './retriever.service';
import { RateLimiterService } from './rate-limiter.service';
import { BaseTool } from '../tools/base.tool';
import { JobPostingTool } from '../tools/job-posting.tool';
import { ApplicationTool } from '../tools/application.tool';
import { CandidateTool } from '../tools/candidate.tool';
import { AnalyticsTool } from '../tools/analytics.tool';
import { InterviewTool } from '../tools/interview.tool';
import { NotificationTool } from '../tools/notification.tool';
import { EmailTool } from '../tools/email.tool';
import { CalendarTool } from '../tools/calendar.tool';
import { QuestionSetTool } from '../tools/question-set.tool';
import { ReportTool } from '../tools/report.tool';
import { JobContentGenerationTool } from '../tools/job-content-generation.tool';
import { ChatRequestDto, ChatResponseDto, ChatSource, ToolCallResult } from '../dto/chat.dto';
import { DocumentEntityType } from '../../../../entities/recruitment/rag-document.entity';
import { ChatMessage } from '../../../../entities/recruitment/chat-session.entity';

export interface AgentContext {
   userId: number;
   sessionId: string;
   sessionContext: any;
   retrievedDocuments: any[];
   availableTools: BaseTool[];
   conversationHistory: ChatMessage[];
}

@Injectable()
export class AgentExecutorService {
   private readonly logger = new Logger(AgentExecutorService.name);
   private readonly genAI: GoogleGenerativeAI;
   private readonly defaultModel = 'gemini-2.0-flash';

   constructor(
      private readonly configService: ConfigService,
      private readonly companyServiceClient: CompanyServiceClient,
      private readonly sessionManager: SessionManagerService,
      private readonly retriever: RetrieverService,
      private readonly rateLimiter: RateLimiterService,
      private readonly jobPostingTool: JobPostingTool,
      private readonly applicationTool: ApplicationTool,
      private readonly candidateTool: CandidateTool,
      private readonly analyticsTool: AnalyticsTool,
      private readonly interviewTool: InterviewTool,
      private readonly notificationTool: NotificationTool,
      private readonly emailTool: EmailTool,
      private readonly calendarTool: CalendarTool,
      private readonly questionSetTool: QuestionSetTool,
      private readonly reportTool: ReportTool,
      private readonly jobContentGenerationTool: JobContentGenerationTool,
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
            throw new Error(
               `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
            );
         }

         // Get or create session
         let session = request.sessionId
            ? await this.sessionManager.getSession(request.sessionId)
            : null;

         if (!session) {
            session = await this.sessionManager.createSession(userId);
         }

         // Handle confirmation if provided
         if (request.confirmation) {
            return await this.handleConfirmation(request.confirmation, session, userId);
         }

         // Add user message to session
         await this.sessionManager.addMessage(session.sessionId, {
            role: 'user',
            content: request.message,
            timestamp: new Date(),
         });

         // Retrieve relevant documents
         const retrievedDocuments = await this.retriever.searchWithFallback(request.message, {
            limit: 10,
            threshold: 0.7,
            filters: {
               entityTypes: this.getEntityTypesFromContext(session.context),
            },
         });

         // Build agent context with conversation history
         const conversationHistory = session.messages.slice(-10);

         const context: AgentContext = {
            userId,
            sessionId: session.sessionId,
            sessionContext: session.context,
            retrievedDocuments,
            availableTools: this.getAvailableTools(),
            conversationHistory,
         };

         // Execute agent with tools (pass pageContext if available)
         const result = await this.executeWithTools(request.message, context, request.pageContext);

         // Add assistant response to session
         await this.sessionManager.addMessage(session.sessionId, {
            role: 'assistant',
            content: result.reply,
            timestamp: new Date(),
            toolCalls: result.toolCalls,
         });

         // Update session context if needed
         if (result.contextUpdates) {
            await this.sessionManager.updateSessionContext(
               session.sessionId,
               result.contextUpdates,
            );
         }

         // Record request for rate limiting
         await this.rateLimiter.recordRequest(userId, session.sessionId);

         const processingTime = Date.now() - startTime;
         this.logger.log(`Agent execution completed in ${processingTime}ms`);

         return {
            reply: result.reply,
            sessionId: session.sessionId,
            sources: result.sources,
            toolCalls: result.toolCalls,
         };
      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.logger.error(`Agent execution failed after ${processingTime}ms:`, error);

         // Return helpful error message
         return {
            reply: this.buildErrorMessage(error.message),
            sessionId: request.sessionId || 'error',
            sources: [],
            toolCalls: [],
         };
      }
   }

   /**
    * Execute agent with tool calling
    */
   private async executeWithTools(
      query: string,
      context: AgentContext,
      pageContext?: any,
   ): Promise<ChatResponseDto> {
      try {
         // Fetch company metadata for context
         let companyMetadata = { departments: [], positions: [], branches: [] };
         try {
            const [departments, positions, branches] = await Promise.all([
               this.companyServiceClient.getDepartments(),
               this.companyServiceClient.getPositions(),
               this.companyServiceClient.getBranches() // Assuming getBranches exists or similar
            ]).catch(() => [[], [], []]); // Fallback to empty if fails
            
            // @ts-ignore
            companyMetadata = { departments, positions, branches };
         } catch (e) {
            this.logger.warn('Failed to fetch company metadata for prompt context', e);
         }

         // Build system prompt (include pageContext if available)
         const systemPrompt = this.buildSystemPrompt(context, pageContext, companyMetadata);

         // Get available tools for Gemini function calling
         const tools = context.availableTools.map((tool) => tool.getToolDefinition());

         // Initialize chat session with conversation history
         const model = this.genAI.getGenerativeModel({
            model: this.defaultModel,
            generationConfig: {
               temperature: 0.7,
               topK: 40,
               topP: 0.95,
               maxOutputTokens: 4096,
            },
            tools:
               tools.length > 0
                  ? (tools.map((tool) => ({
                       functionDeclarations: [tool as any],
                    })) as any)
                  : undefined,
            systemInstruction: {
               role: 'system',
               parts: [{ text: systemPrompt }],
            },
         });

         // Start chat session with conversation history
         const chat = model.startChat({
            history: this.buildConversationHistory(context.conversationHistory),
         });

         // Build user prompt with retrieved documents context
         const userPrompt = this.buildUserPrompt(query, context);

         // Send message to chat
         const response = await chat.sendMessage(userPrompt);
         const content = response.response.text();

         // Check for function calls
         const functionCalls = response.response.functionCalls();
         let toolResults: ToolCallResult[] = [];
         let finalReply = content;

         // Execute function calls if any
         if (functionCalls && functionCalls.length > 0) {
            // Execute all tool calls
            for (const functionCall of functionCalls) {
               try {
                  const tool = context.availableTools.find((t) => t.name === functionCall.name);
                  if (!tool) {
                     this.logger.warn(`Unknown tool: ${functionCall.name}`);
                     continue;
                  }

                  const toolResult = await tool.execute(functionCall.args, {
                     userId: context.userId,
                     sessionId: context.sessionId,
                     sessionContext: context.sessionContext,
                  });

                  const toolCallResult: ToolCallResult = {
                     toolName: functionCall.name,
                     parameters: functionCall.args,
                     result: toolResult,
                  };

                  if (
                     toolResult.error === 'confirmation_required' &&
                     toolResult.data?.requiresConfirmation
                  ) {
                     toolCallResult.requiresConfirmation = true;
                     toolCallResult.confirmationMessage = toolResult.message;
                  }

                  toolResults.push(toolCallResult);

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
                        error: toolError.message,
                     },
                  });
               }
            }

            // Send tool results back to Gemini for final response
            if (toolResults.length > 0) {
               const toolResultsText = this.formatToolResultsForLLM(toolResults);
               const followUpResponse = await chat.sendMessage(
                  `Tool execution results:\n${toolResultsText}\n\nPlease provide a comprehensive, user-friendly response that incorporates these results and answers the user's question: ${query}\n\nIMPORTANT: Do NOT display JSON, code blocks, or raw data structures in your response. Only use natural language to describe the results. The JSON data is for internal processing only, not for user display.`,
               );
               finalReply = followUpResponse.response.text();
            }
         }

         // Format sources
         const sources: ChatSource[] = context.retrievedDocuments.map((doc) => ({
            documentId: doc.documentId,
            entityType: doc.entityType,
            entityId: doc.entityId,
            relevance: doc.similarity,
         }));

         const requiresConfirmation = toolResults.some((tr) => tr.requiresConfirmation);

         return {
            reply: finalReply,
            sessionId: context.sessionId,
            sources,
            toolCalls: toolResults,
            contextUpdates: this.extractContextUpdates(toolResults),
            requiresConfirmation,
         };
      } catch (error) {
         this.logger.error('Tool execution failed:', error);
         throw error;
      }
   }

   /**
    * Build system prompt
    */
   private buildSystemPrompt(context: AgentContext, pageContext?: any, companyMetadata?: any): string {
      const { sessionContext } = context;

      let pageContextInfo = '';
      if (pageContext) {
         pageContextInfo = `\n- Trang hiện tại: ${pageContext.page || 'general'}`;
         if (pageContext.page === 'job-create' && pageContext.formData) {
            pageContextInfo += `\n- User đang ở trang tạo job posting`;
            pageContextInfo += `\n- Khi user yêu cầu tạo job hoặc điền thông tin job, hãy sử dụng tool generate_job_content để tạo nội dung`;
            pageContextInfo += `\n- Sau khi generate, hỏi lại user về các field không thể suy luận: departmentId, positionId, headquarterId, applicationDeadline`;
         }
      }

      let metadataInfo = '';
      if (companyMetadata) {
          if (companyMetadata.departments && companyMetadata.departments.length > 0) {
              metadataInfo += `\nDanh sách Phòng ban (Department):\n`;
              metadataInfo += companyMetadata.departments.map((d: any) => `- ${d.name} (ID: ${d.departmentId})`).join('\n');
          }
          if (companyMetadata.positions && companyMetadata.positions.length > 0) {
              metadataInfo += `\n\nDanh sách Vị trí (Position):\n`;
              metadataInfo += companyMetadata.positions.map((p: any) => `- ${p.name} (ID: ${p.positionId})`).join('\n');
          }
          if (companyMetadata.branches && companyMetadata.branches.length > 0) {
              metadataInfo += `\n\nDanh sách Chi nhánh (Headquarter/Branch):\n`;
              metadataInfo += companyMetadata.branches.map((b: any) => `- ${b.name} (ID: ${b.branchId || b.id})`).join('\n');
          }
      }

      return `
Bạn là AI Assistant hỗ trợ admin quản lý tuyển dụng cho TechLeet.

Vai trò của bạn:
- Trả lời câu hỏi về job postings, candidates, applications, interviews
- Tạo và cập nhật job postings theo yêu cầu
- Phân tích và tổng hợp thông tin tuyển dụng
- Hỗ trợ quyết định tuyển dụng với dữ liệu và insights
- Hỗ trợ tạo nội dung job posting bằng AI khi user đang ở trang create job

Context hiện tại:
- Focus: ${sessionContext.currentFocus}
- Các entity liên quan: ${sessionContext.recentEntityIds.join(', ') || 'Không có'}
- Ngôn ngữ: ${sessionContext.preferences.language}
- Phong cách: ${sessionContext.preferences.responseStyle}
- Bao gồm sources: ${sessionContext.preferences.includeSources ? 'Có' : 'Không'}${pageContextInfo}

Nguyên tắc:
1. Trả lời bằng Markdown với formatting rõ ràng
2. Cite sources từ database khi có thể
3. Xác nhận trước khi thực hiện write operations quan trọng
4. Đề xuất actions liên quan và insights hữu ích
5. Sử dụng tools để lấy dữ liệu chính xác và cập nhật thông tin
6. Luôn cung cấp context và giải thích cho các recommendations
7. Khi user đang ở trang create job và yêu cầu tạo job, sử dụng generate_job_content tool để tạo nội dung
8. Sau khi generate content, KHÔNG hỏi thêm về các thông tin còn thiếu (department, position, location...). Hãy để user tự điền thủ công trên form.
9. QUAN TRỌNG - Xử lý follow-up messages và confirmation:
   a) Khi user cung cấp thông tin bổ sung, hãy extract và gọi lại tool generate_job_content.
   b) Khi user xác nhận ngắn gọn (ok, đồng ý), hãy tự động extract thông tin từ history.
   c) Luôn check conversation history trước khi hỏi lại.
10. QUAN TRỌNG: 
    - KHÔNG BAO GIỜ hiển thị JSON, code blocks với JSON, hoặc raw data structure.
    - KHÔNG BAO GIỜ hiển thị các key kỹ thuật như "departmentId", "positionId" trong câu trả lời.
11. Khi tool trả về kết quả, hãy mô tả kết quả bằng ngôn ngữ tự nhiên.
12. Tự động map tên phòng ban/vị trí sang ID:
    - Sử dụng danh sách Metadata để tìm ID tương ứng.
    - Nếu không tìm thấy ID, hãy truyền TÊN vào các trường name (departmentName, positionName...).

THÔNG TIN METADATA (Dùng để map Name -> ID):
${metadataInfo}

Available tools: ${context.availableTools.map((t) => t.name).join(', ')}
    `.trim();
   }

   /**
    * Build user prompt with context
    */
   private buildUserPrompt(query: string, context: AgentContext): string {
      const { retrievedDocuments, conversationHistory } = context;

      let prompt = `Truy vấn người dùng: ${query}\n\n`;

      // Check if previous message was about job content generation asking for missing fields
      const lastAssistantMessage = conversationHistory
         .filter(m => m.role === 'assistant')
         .slice(-1)[0];
      
      const lastToolCalls = (lastAssistantMessage?.toolCalls as any[]) || [];
      const lastJobContentToolCall = lastToolCalls.find(
         (tc: any) => tc && tc.toolName === 'generate_job_content'
      );

      if (lastJobContentToolCall && lastJobContentToolCall.result) {
         const toolResult = lastJobContentToolCall.result;
         const hasMissingFields = toolResult.success && 
                                  toolResult.data && 
                                  Array.isArray(toolResult.data.missingFields) &&
                                  toolResult.data.missingFields.length > 0;

         if (hasMissingFields) {
            const originalParams = lastJobContentToolCall.parameters || {};
            const missingFields = toolResult.data.missingFields || [];
            
            prompt += `CONTEXT QUAN TRỌNG: Trong conversation trước, bạn đã gọi tool generate_job_content và đã tạo nội dung job posting. Tool đã trả về missingFields và generatedFields.\n\n`;
            prompt += `Các tham số đã sử dụng lần trước: ${JSON.stringify(originalParams)}\n\n`;
            if (toolResult.data.generatedFields) {
               prompt += `Generated fields từ lần trước: ${JSON.stringify(toolResult.data.generatedFields)}\n\n`;
            }
            
            // Map technical field names to friendly names
            const friendlyMissingFields = missingFields.map(field => {
               const map: any = {
                  'departmentId': 'Tên Phòng ban',
                  'positionId': 'Tên Vị trí',
                  'headquarterId': 'Chi nhánh/Văn phòng',
                  'applicationDeadline': 'Hạn nộp hồ sơ'
               };
               return map[field] || field;
            });

            prompt += `Các thông tin còn thiếu: ${friendlyMissingFields.join(', ')}\n\n`;
            
            prompt += `User đang phản hồi lại câu hỏi của bạn. Bạn CẦN:\n`;
            prompt += `1. Đọc message hiện tại của user VÀ xem lại conversation history để tìm thông tin cho các missing fields\n`;
            prompt += `2. Nếu user đã cung cấp thông tin (ví dụ: "Phòng Engineering", "Vị trí Senior", "TPHCM", "30/4/2025"...), hãy extract giá trị đó\n`;
            prompt += `3. Gọi lại tool generate_job_content với TẤT CẢ thông tin: các tham số từ lần trước + thông tin mới extract được + thông tin từ conversation history\n`;
            prompt += `4. LƯU Ý QUAN TRỌNG: Nếu user cung cấp Tên (ví dụ "Phòng Engineering", "HCM"), và bạn KHÔNG THỂ map sang ID chính xác, hãy truyền thẳng giá trị đó vào các trường Name (departmentName, positionName, headquarterName). Tool sẽ tự động xử lý.\n`;
            prompt += `5. Chỉ khi thực sự KHÔNG tìm thấy thông tin trong toàn bộ conversation, mới hỏi lại user. TUYỆT ĐỐI KHÔNG HỎI ID, HÃY HỎI TÊN VÀ KHÔNG dùng key kỹ thuật (VD: KHÔNG viết "departmentId: ...").\n\n`;
         }
      }


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
    * Build conversation history for Gemini ChatSession
    * Google Generative AI requires first message to be 'user', not 'model'
    */
   private buildConversationHistory(
      messages: ChatMessage[],
   ): Array<{ role: string; parts: Array<{ text: string }> }> {
      if (!messages || messages.length === 0) {
         return [];
      }

      // Take last 10 messages
      const recentMessages = messages.slice(-10);
      
      // Filter and validate: ensure first message is 'user'
      const validMessages: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      
      for (let i = 0; i < recentMessages.length; i++) {
         const msg = recentMessages[i];
         const role = msg.role === 'user' ? 'user' : 'model';
         
         // If this is the first message and it's not 'user', skip it
         if (validMessages.length === 0 && role !== 'user') {
            continue;
         }
         
         validMessages.push({
            role,
            parts: [{ text: msg.content }],
         });
      }

      return validMessages;
   }

   /**
    * Format tool results for LLM consumption
    */
   private formatToolResultsForLLM(toolResults: ToolCallResult[]): string {
      return toolResults
         .map((result) => {
            const status = result.result.success ? '✅' : '❌';
            const data =
               result.result.success && result.result.data
                  ? JSON.stringify(result.result.data, null, 2)
                  : result.result.error || 'No data';

            return `${status} ${result.toolName}:\n${data}`;
         })
         .join('\n\n');
   }

   /**
    * Get available tools
    */
   private getAvailableTools(): BaseTool[] {
      return [
         this.jobPostingTool,
         this.applicationTool,
         this.candidateTool,
         this.analyticsTool,
         this.interviewTool,
         this.notificationTool,
         this.emailTool,
         this.calendarTool,
         this.questionSetTool,
         this.reportTool,
         this.jobContentGenerationTool,
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
            return [
               DocumentEntityType.JOB_POSTING,
               DocumentEntityType.CANDIDATE,
               DocumentEntityType.APPLICATION,
               DocumentEntityType.INTERVIEW,
            ];
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
    * Handle confirmation request
    */
   private async handleConfirmation(
      confirmation: { toolName: string; parameters: any; confirmed: boolean },
      session: any,
      userId: number,
   ): Promise<ChatResponseDto> {
      if (!confirmation.confirmed) {
         await this.sessionManager.addMessage(session.sessionId, {
            role: 'assistant',
            content: 'Action cancelled by user.',
            timestamp: new Date(),
         });

         return {
            reply: 'Action cancelled. How can I help you?',
            sessionId: session.sessionId,
            sources: [],
            toolCalls: [],
         };
      }

      const tool = this.getAvailableTools().find((t) => t.name === confirmation.toolName);
      if (!tool) {
         throw new Error(`Unknown tool: ${confirmation.toolName}`);
      }

      const toolResult = await tool.execute(confirmation.parameters, {
         userId,
         sessionId: session.sessionId,
         sessionContext: session.context,
      });

      const toolCallResult: ToolCallResult = {
         toolName: confirmation.toolName,
         parameters: confirmation.parameters,
         result: toolResult,
      };

      const reply = toolResult.success
         ? toolResult.message || `${confirmation.toolName} executed successfully`
         : `Error: ${toolResult.message || toolResult.error}`;

      await this.sessionManager.addMessage(session.sessionId, {
         role: 'assistant',
         content: reply,
         timestamp: new Date(),
         toolCalls: [toolCallResult],
      });

      return {
         reply,
         sessionId: session.sessionId,
         sources: [],
         toolCalls: [toolCallResult],
         contextUpdates: this.extractContextUpdates([toolCallResult]),
      };
   }

   /**
    * Extract context updates from tool results
    */
   private extractContextUpdates(toolResults: ToolCallResult[]): any {
      const updates: any = {};

      // Update focus based on tool usage
      const toolNames = toolResults.map((r) => r.toolName);
      if (toolNames.includes('job_posting_tool')) {
         updates.currentFocus = 'job_postings';
      } else if (toolNames.includes('application_tool')) {
         updates.currentFocus = 'applications';
      } else if (toolNames.includes('candidate_tool')) {
         updates.currentFocus = 'candidates';
      } else if (toolNames.includes('interview_tool')) {
         updates.currentFocus = 'interviews';
      } else if (toolNames.includes('question_set_tool')) {
         updates.currentFocus = 'question_sets';
      } else if (toolNames.includes('report_tool')) {
         updates.currentFocus = 'reports';
      } else if (toolNames.includes('email_tool')) {
         updates.currentFocus = 'communications';
      } else if (toolNames.includes('calendar_tool')) {
         updates.currentFocus = 'calendar';
      } else if (toolNames.includes('notification_tool')) {
         updates.currentFocus = 'notifications';
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
