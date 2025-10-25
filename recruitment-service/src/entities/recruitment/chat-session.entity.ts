import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  toolName: string;
  parameters: any;
  result?: any;
}

export interface SessionContext {
  currentFocus: 'job_postings' | 'candidates' | 'applications' | 'interviews' | 'general';
  recentEntityIds: number[];
  preferences: {
    language: 'vi' | 'en';
    responseStyle: 'detailed' | 'concise';
    includeSources: boolean;
  };
}

@Entity('chat_session')
@Index(['userId'])
@Index(['lastActiveAt'])
@Index(['expiresAt'])
export class ChatSessionEntity {
  @PrimaryGeneratedColumn('uuid', {
    comment: 'Unique identifier for the chat session'
  })
  @ApiProperty({
    description: 'Unique identifier for the chat session',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  sessionId: string;

  @Column({
    name: 'user_id',
    type: 'int',
    nullable: false,
    comment: 'ID of the admin user who owns this session'
  })
  @ApiProperty({
    description: 'ID of the admin user who owns this session',
    example: 1
  })
  userId: number;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: '[]',
    comment: 'Array of chat messages in this session'
  })
  @ApiProperty({
    description: 'Array of chat messages in this session',
    example: [
      {
        role: 'user',
        content: 'How many job postings are active?',
        timestamp: '2024-01-15T10:30:00Z'
      },
      {
        role: 'assistant',
        content: 'There are currently 15 active job postings...',
        timestamp: '2024-01-15T10:30:05Z',
        toolCalls: []
      }
    ]
  })
  messages: ChatMessage[];

  @Column({
    type: 'jsonb',
    nullable: false,
    default: '{}',
    comment: 'Session context and state'
  })
  @ApiProperty({
    description: 'Session context and state',
    example: {
      currentFocus: 'job_postings',
      recentEntityIds: [1, 2, 3],
      preferences: {
        language: 'vi',
        responseStyle: 'detailed',
        includeSources: true
      }
    }
  })
  context: SessionContext;

  @Column({
    name: 'last_active_at',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the session was last active'
  })
  @ApiProperty({
    description: 'When the session was last active',
    example: '2024-01-15T10:30:00Z'
  })
  lastActiveAt: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the session was created'
  })
  @ApiProperty({
    description: 'When the session was created',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
    nullable: false,
    comment: 'When the session expires (24 hours from last activity)'
  })
  @ApiProperty({
    description: 'When the session expires',
    example: '2024-01-16T10:30:00Z'
  })
  expiresAt: Date;
}
