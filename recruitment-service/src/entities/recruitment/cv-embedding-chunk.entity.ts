import {
   Entity,
   PrimaryGeneratedColumn,
   Column,
   Index,
   CreateDateColumn,
   UpdateDateColumn,
   ManyToOne,
   JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('cv_embedding_chunk')
@Index(['applicationId'])
@Index(['applicationId', 'chunkIndex'])
export class CvEmbeddingChunkEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the embedding chunk'
   })
   @ApiProperty({
      description: 'Unique identifier for the embedding chunk',
      example: 1
   })
   chunkId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to the application'
   })
   @ApiProperty({
      description: 'Reference to the application',
      example: 123
   })
   applicationId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Index of the chunk within the CV (0-based)'
   })
   @ApiProperty({
      description: 'Index of the chunk within the CV (0-based)',
      example: 0
   })
   chunkIndex: number;

   @Column({
      type: 'text',
      nullable: false,
      comment: 'Text content of this chunk'
   })
   @ApiProperty({
      description: 'Text content of this chunk',
      example: 'Software engineer with 5 years of experience in React and Node.js...'
   })
   chunkText: string;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Start position of chunk in original CV text'
   })
   @ApiProperty({
      description: 'Start position of chunk in original CV text',
      example: 0
   })
   startPosition: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'End position of chunk in original CV text'
   })
   @ApiProperty({
      description: 'End position of chunk in original CV text',
      example: 1200
   })
   endPosition: number;

   // Using vector type for pgvector
   @Column({
      type: 'varchar', // Will be migrated to vector(768) in migration
      nullable: true, // Allow NULL initially, embeddings are generated asynchronously
      comment: 'Vector embedding of the chunk text (768 dimensions for Gemini text-embedding-004)'
   })
   @ApiPropertyOptional({
      description: 'Vector embedding of the chunk text',
      example: '[0.1, -0.2, 0.3, ...]'
   })
   embedding?: string; // Will hold vector data after migration

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

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Additional metadata about the chunk'
   })
   @ApiPropertyOptional({
      description: 'Additional metadata about the chunk',
      example: {
         tokenCount: 150,
         overlapWithPrevious: 100,
         overlapWithNext: 100,
         section: 'experience'
      }
   })
   metadata?: any;

   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'When the chunk embedding was created'
   })
   @ApiProperty({
      description: 'When the chunk embedding was created',
      example: '2024-01-15T10:30:00Z'
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'When the chunk embedding was last updated'
   })
   @ApiProperty({
      description: 'When the chunk embedding was last updated',
      example: '2024-01-15T10:30:00Z'
   })
   updatedAt: Date;
}
