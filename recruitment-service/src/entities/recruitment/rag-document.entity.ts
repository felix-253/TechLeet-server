import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentEntityType {
  JOB_POSTING = 'job_posting',
  APPLICATION = 'application',
  CANDIDATE = 'candidate',
  INTERVIEW = 'interview',
  FILE = 'file'
}

@Entity('rag_document')
@Index(['entityType'])
@Index(['entityId'])
@Index(['entityType', 'entityId'], { unique: true })
export class RagDocumentEntity {
  @PrimaryGeneratedColumn('identity', {
    comment: 'Unique identifier for the document'
  })
  @ApiProperty({
    description: 'Unique identifier for the document',
    example: 1
  })
  documentId: number;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: DocumentEntityType,
    nullable: false,
    comment: 'Type of entity this document represents'
  })
  @ApiProperty({
    description: 'Type of entity this document represents',
    enum: DocumentEntityType,
    example: DocumentEntityType.JOB_POSTING
  })
  entityType: DocumentEntityType;

  @Column({
    name: 'entity_id',
    type: 'int',
    nullable: false,
    comment: 'ID of the referenced entity'
  })
  @ApiProperty({
    description: 'ID of the referenced entity',
    example: 123
  })
  entityId: number;

  @Column({
    type: 'text',
    nullable: false,
    comment: 'Content text to be indexed and searched'
  })
  @ApiProperty({
    description: 'Content text to be indexed and searched',
    example: 'Senior React Developer with 5+ years experience...'
  })
  content: string;

  @Column({
    type: 'varchar', // Will be migrated to vector(768) in migration
    nullable: true,
    comment: 'Vector embedding of the content (768 dimensions for Gemini text-embedding-004)'
  })
  @ApiPropertyOptional({
    description: 'Vector embedding of the content',
    example: '[0.1, -0.2, 0.3, ...]'
  })
  embedding?: string; // Will hold vector data after migration

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata about the document'
  })
  @ApiPropertyOptional({
    description: 'Additional metadata about the document',
    example: {
      title: 'Senior React Developer',
      status: 'published',
      department: 'Engineering',
      skills: ['React', 'TypeScript', 'Node.js']
    }
  })
  metadata?: any;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: 'text-embedding-004',
    comment: 'Model used to generate the embedding'
  })
  @ApiProperty({
    description: 'Model used to generate the embedding',
    example: 'text-embedding-004'
  })
  model: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 768,
    comment: 'Dimension of the embedding vector'
  })
  @ApiProperty({
    description: 'Dimension of the embedding vector',
    example: 768
  })
  dimensions: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the document was created'
  })
  @ApiProperty({
    description: 'When the document was created',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: 'When the document was last updated'
  })
  @ApiProperty({
    description: 'When the document was last updated',
    example: '2024-01-15T10:30:00Z'
  })
  updatedAt: Date;
}
