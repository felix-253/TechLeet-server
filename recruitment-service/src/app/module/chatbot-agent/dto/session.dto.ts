import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsEnum, IsObject, IsNumber, IsDateString } from 'class-validator';

export enum DocumentEntityType {
  JOB_POSTING = 'job_posting',
  APPLICATION = 'application',
  CANDIDATE = 'candidate',
  INTERVIEW = 'interview',
  FILE = 'file'
}

export class SessionContextDto {
  @ApiProperty({
    description: 'Current focus area of the session',
    example: 'job_postings'
  })
  @IsString()
  currentFocus: string;

  @ApiProperty({
    description: 'Recently accessed entity IDs',
    example: [1, 2, 3]
  })
  @IsArray()
  recentEntityIds: number[];

  @ApiProperty({
    description: 'User preferences',
    example: {
      language: 'vi',
      responseStyle: 'detailed',
      includeSources: true
    }
  })
  @IsObject()
  preferences: {
    language: 'vi' | 'en';
    responseStyle: 'detailed' | 'concise';
    includeSources: boolean;
  };
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'Role of the message sender',
    example: 'user'
  })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty({
    description: 'Message content',
    example: 'How many job postings are active?'
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  @IsDateString()
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Tool calls made in this message',
    example: []
  })
  @IsOptional()
  @IsArray()
  toolCalls?: any[];
}

export class SessionDto {
  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'User ID who owns this session',
    example: 1
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'Chat messages in this session',
    type: [ChatMessageDto]
  })
  @IsArray()
  messages: ChatMessageDto[];

  @ApiProperty({
    description: 'Session context',
    type: SessionContextDto
  })
  @IsObject()
  context: SessionContextDto;

  @ApiProperty({
    description: 'Last active timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  @IsDateString()
  lastActiveAt: Date;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2024-01-16T10:30:00Z'
  })
  @IsDateString()
  expiresAt: Date;
}

export class MetadataFiltersDto {
  @ApiPropertyOptional({
    description: 'Entity types to filter by',
    example: ['job_posting', 'application']
  })
  @IsOptional()
  @IsArray()
  entityTypes?: DocumentEntityType[];

  @ApiPropertyOptional({
    description: 'Status filter',
    example: 'published'
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Date range start',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date range end',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Department filter',
    example: 'Engineering'
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Skills filter',
    example: ['React', 'TypeScript']
  })
  @IsOptional()
  @IsArray()
  skills?: string[];
}

export class RetrievalResultDto {
  @ApiProperty({
    description: 'Document ID',
    example: 1
  })
  documentId: number;

  @ApiProperty({
    description: 'Entity type',
    example: 'job_posting'
  })
  entityType: DocumentEntityType;

  @ApiProperty({
    description: 'Entity ID',
    example: 123
  })
  entityId: number;

  @ApiProperty({
    description: 'Document content',
    example: 'Senior React Developer with 5+ years experience...'
  })
  content: string;

  @ApiProperty({
    description: 'Similarity score',
    example: 0.95
  })
  similarity: number;

  @ApiProperty({
    description: 'Document metadata',
    example: {
      title: 'Senior React Developer',
      status: 'published',
      department: 'Engineering'
    }
  })
  metadata: any;
}
