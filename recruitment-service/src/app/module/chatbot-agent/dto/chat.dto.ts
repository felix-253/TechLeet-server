import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsEnum, IsObject } from 'class-validator';
import { DocumentEntityType } from '../../../../entities/recruitment/rag-document.entity';

export enum SessionFocus {
  JOB_POSTINGS = 'job_postings',
  CANDIDATES = 'candidates',
  APPLICATIONS = 'applications',
  INTERVIEWS = 'interviews',
  GENERAL = 'general'
}

export class ChatRequestDto {
  @ApiProperty({
    description: 'User message to send to the chatbot',
    example: 'How many job postings are currently active?'
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Session ID to continue conversation',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Confirmation for a previous tool call that required confirmation',
    example: {
      toolName: 'job_posting_tool',
      parameters: { action: 'delete', id: 123 },
      confirmed: true
    }
  })
  @IsOptional()
  @IsObject()
  confirmation?: {
    toolName: string;
    parameters: any;
    confirmed: boolean;
  };

  @ApiPropertyOptional({
    description: 'Page context to provide additional information about current page',
    example: {
      page: 'job-create',
      formData: { title: 'React Developer' }
    }
  })
  @IsOptional()
  @IsObject()
  pageContext?: {
    page: string;
    formData?: any;
  };
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Chatbot response message',
    example: 'There are currently 15 active job postings in the system.'
  })
  reply: string;

  @ApiProperty({
    description: 'Session ID for this conversation',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Sources used to generate the response',
    example: [
      {
        documentId: 1,
        entityType: 'job_posting',
        entityId: 123,
        relevance: 0.95
      }
    ]
  })
  @IsOptional()
  @IsArray()
  sources?: ChatSource[];

  @ApiPropertyOptional({
    description: 'Tool calls made during processing',
    example: [
      {
        toolName: 'getJobStats',
        parameters: { status: 'published' },
        result: { count: 15 }
      }
    ]
  })
  @IsOptional()
  @IsArray()
  toolCalls?: ToolCallResult[];

  @ApiPropertyOptional({
    description: 'Whether the response requires user confirmation',
    example: false
  })
  @IsOptional()
  requiresConfirmation?: boolean;

  @ApiPropertyOptional({
    description: 'Context updates from tool execution',
    example: {
      currentFocus: 'job_postings',
      recentEntityIds: [123, 456]
    }
  })
  @IsOptional()
  @IsObject()
  contextUpdates?: any;
}

export class ChatSource {
  @ApiProperty()
  documentId: number;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: number;

  @ApiProperty()
  relevance: number;
}

export class ToolCallResult {
  @ApiProperty()
  toolName: string;

  @ApiProperty()
  parameters: any;

  @ApiProperty()
  result: any;

  @ApiPropertyOptional({
    description: 'Whether this tool call requires confirmation',
    example: false
  })
  @IsOptional()
  requiresConfirmation?: boolean;

  @ApiPropertyOptional({
    description: 'Confirmation message if requiresConfirmation is true',
    example: 'Are you sure you want to delete this job posting?'
  })
  @IsOptional()
  confirmationMessage?: string;
}

export class SessionRequestDto {
  @ApiPropertyOptional({
    description: 'User ID (optional, will be extracted from headers if not provided)',
    example: 16
  })
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Focus area for the session',
    enum: SessionFocus,
    example: SessionFocus.JOB_POSTINGS
  })
  @IsOptional()
  @IsEnum(SessionFocus)
  focus?: SessionFocus;

  @ApiPropertyOptional({
    description: 'User preferences for the session',
    example: {
      language: 'vi',
      responseStyle: 'detailed',
      includeSources: true
    }
  })
  @IsOptional()
  @IsObject()
  preferences?: {
    language: 'vi' | 'en';
    responseStyle: 'detailed' | 'concise';
    includeSources: boolean;
  };
}

export class SessionResponseDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  messages: any[];

  @ApiProperty()
  context: any;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt: Date;
}

export class IndexTriggerDto {
  @ApiPropertyOptional({
    description: 'Entity types to index',
    example: [DocumentEntityType.JOB_POSTING, DocumentEntityType.APPLICATION, DocumentEntityType.CANDIDATE],
    enum: DocumentEntityType,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DocumentEntityType, { each: true })
  entityTypes?: DocumentEntityType[];

  @ApiPropertyOptional({
    description: 'Force re-indexing of existing documents',
    example: false
  })
  @IsOptional()
  forceReindex?: boolean;
}

export class IndexResponseDto {
  @ApiProperty({
    description: 'Job ID for tracking indexing progress',
    example: 'index-job-123'
  })
  jobId: string;

  @ApiProperty({
    description: 'Number of documents queued for indexing',
    example: 150
  })
  documentsQueued: number;

  @ApiProperty({
    description: 'Entity types being indexed',
    example: ['job_posting', 'application', 'candidate']
  })
  entityTypes: string[];
}
