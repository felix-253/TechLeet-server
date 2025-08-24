import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScreeningStatus {
   PENDING = 'pending',
   PROCESSING = 'processing',
   COMPLETED = 'completed',
   FAILED = 'failed'
}

@Entity('cv_screening_result')
@Index(['applicationId'], { unique: true })
@Index(['status'])
@Index(['overallScore'])
export class CvScreeningResultEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the CV screening result'
   })
   @ApiProperty({
      description: 'Unique identifier for the CV screening result',
      example: 1
   })
   screeningId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to the application being screened'
   })
   @ApiProperty({
      description: 'Reference to the application being screened',
      example: 123
   })
   applicationId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to the job posting'
   })
   @ApiProperty({
      description: 'Reference to the job posting',
      example: 456
   })
   jobPostingId: number;

   @Column({
      type: 'enum',
      enum: ScreeningStatus,
      default: ScreeningStatus.PENDING,
      comment: 'Current status of the screening process'
   })
   @ApiProperty({
      description: 'Current status of the screening process',
      enum: ScreeningStatus,
      example: ScreeningStatus.COMPLETED
   })
   status: ScreeningStatus;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Extracted text content from the CV'
   })
   @ApiPropertyOptional({
      description: 'Extracted text content from the CV',
      example: 'John Doe\nSoftware Engineer\n5 years experience...'
   })
   extractedText?: string;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: 'Overall similarity score (0-100)'
   })
   @ApiPropertyOptional({
      description: 'Overall similarity score (0-100)',
      example: 85.75
   })
   overallScore?: number;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: 'Skills match score (0-100)'
   })
   @ApiPropertyOptional({
      description: 'Skills match score (0-100)',
      example: 92.50
   })
   skillsScore?: number;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: 'Experience match score (0-100)'
   })
   @ApiPropertyOptional({
      description: 'Experience match score (0-100)',
      example: 78.25
   })
   experienceScore?: number;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: 'Education match score (0-100)'
   })
   @ApiPropertyOptional({
      description: 'Education match score (0-100)',
      example: 88.00
   })
   educationScore?: number;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 4,
      nullable: true,
      comment: 'Vector similarity score using full CV embedding (0-1)'
   })
   @ApiPropertyOptional({
      description: 'Vector similarity score using full CV embedding (0-1)',
      example: 0.8542
   })
   vectorSimilarity?: number;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 4,
      nullable: true,
      comment: 'Chunk-based similarity score using max chunk similarity (0-1)'
   })
   @ApiPropertyOptional({
      description: 'Chunk-based similarity score using max chunk similarity (0-1)',
      example: 0.9125
   })
   chunkSimilarity?: number;

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Extracted skills from CV'
   })
   @ApiPropertyOptional({
      description: 'Extracted skills from CV',
      example: ['JavaScript', 'React', 'Node.js', 'TypeScript']
   })
   extractedSkills?: string[];

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Extracted work experience details'
   })
   @ApiPropertyOptional({
      description: 'Extracted work experience details',
      example: [
         {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: '2023-12-31',
            duration: '4 years'
         }
      ]
   })
   extractedExperience?: any[];

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Extracted education details'
   })
   @ApiPropertyOptional({
      description: 'Extracted education details',
      example: [
         {
            institution: 'University of Technology',
            degree: 'Bachelor of Computer Science',
            graduationYear: 2019
         }
      ]
   })
   extractedEducation?: any[];

   @Column({
      type: 'text',
      nullable: true,
      comment: 'AI-generated summary of the CV'
   })
   @ApiPropertyOptional({
      description: 'AI-generated summary of the CV',
      example: 'Experienced software engineer with 5+ years in full-stack development...'
   })
   aiSummary?: string;

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Key highlights identified by AI'
   })
   @ApiPropertyOptional({
      description: 'Key highlights identified by AI',
      example: [
         'Strong technical skills in modern web technologies',
         'Leadership experience managing development teams',
         'Excellent problem-solving abilities'
      ]
   })
   keyHighlights?: string[];

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Potential concerns or gaps identified'
   })
   @ApiPropertyOptional({
      description: 'Potential concerns or gaps identified',
      example: [
         'Limited experience with cloud platforms',
         'No formal project management certification'
      ]
   })
   concerns?: string[];

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Error message if screening failed'
   })
   @ApiPropertyOptional({
      description: 'Error message if screening failed',
      example: 'Failed to extract text from PDF'
   })
   errorMessage?: string;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Processing time in milliseconds'
   })
   @ApiPropertyOptional({
      description: 'Processing time in milliseconds',
      example: 15000
   })
   processingTimeMs?: number;

   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'When the screening was initiated'
   })
   @ApiProperty({
      description: 'When the screening was initiated',
      example: '2024-01-15T10:30:00Z'
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'When the screening was last updated'
   })
   @ApiProperty({
      description: 'When the screening was last updated',
      example: '2024-01-15T10:35:00Z'
   })
   updatedAt: Date;

   @Column({
      type: 'timestamp',
      nullable: true,
      comment: 'When the screening was completed'
   })
   @ApiPropertyOptional({
      description: 'When the screening was completed',
      example: '2024-01-15T10:35:00Z'
   })
   completedAt?: Date;
}
