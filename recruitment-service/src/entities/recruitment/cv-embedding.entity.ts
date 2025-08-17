import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmbeddingType {
   CV_FULL_TEXT = 'cv_full_text',
   CV_SKILLS = 'cv_skills',
   CV_EXPERIENCE = 'cv_experience',
   CV_EDUCATION = 'cv_education',
   JOB_DESCRIPTION = 'job_description',
   JOB_REQUIREMENTS = 'job_requirements'
}

@Entity('cv_embedding')
@Index(['applicationId'])
@Index(['jobPostingId'])
@Index(['embeddingType'])
export class CvEmbeddingEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the embedding'
   })
   @ApiProperty({
      description: 'Unique identifier for the embedding',
      example: 1
   })
   embeddingId: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to the application (for CV embeddings)'
   })
   @ApiPropertyOptional({
      description: 'Reference to the application (for CV embeddings)',
      example: 123
   })
   applicationId?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to the job posting (for job embeddings)'
   })
   @ApiPropertyOptional({
      description: 'Reference to the job posting (for job embeddings)',
      example: 456
   })
   jobPostingId?: number;

   @Column({
      type: 'enum',
      enum: EmbeddingType,
      nullable: false,
      comment: 'Type of content that was embedded'
   })
   @ApiProperty({
      description: 'Type of content that was embedded',
      enum: EmbeddingType,
      example: EmbeddingType.CV_FULL_TEXT
   })
   embeddingType: EmbeddingType;

   @Column({
      type: 'text',
      nullable: false,
      comment: 'Original text that was embedded'
   })
   @ApiProperty({
      description: 'Original text that was embedded',
      example: 'Software engineer with 5 years of experience in React and Node.js...'
   })
   originalText: string;

   // Using string type for pgvector as per documentation
   @Column({
      type: 'varchar',
      nullable: false,
      comment: 'Vector embedding of the text (768 dimensions for Gemini text-embedding-004)'
   })
   @ApiProperty({
      description: 'Vector embedding of the text',
      example: '[0.1, -0.2, 0.3, ...]'
   })
   embedding: string;

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
      comment: 'Additional metadata about the embedding'
   })
   @ApiPropertyOptional({
      description: 'Additional metadata about the embedding',
      example: {
         tokenCount: 150,
         processingTime: 500,
         confidence: 0.95
      }
   })
   metadata?: any;

   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'When the embedding was created'
   })
   @ApiProperty({
      description: 'When the embedding was created',
      example: '2024-01-15T10:30:00Z'
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'When the embedding was last updated'
   })
   @ApiProperty({
      description: 'When the embedding was last updated',
      example: '2024-01-15T10:30:00Z'
   })
   updatedAt: Date;


}
