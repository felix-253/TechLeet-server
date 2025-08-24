import {
   Entity,
   PrimaryGeneratedColumn,
   Column,
   Index,
   CreateDateColumn,
   UpdateDateColumn,
   OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SkillCategory {
   PROGRAMMING_LANGUAGE = 'programming_language',
   FRAMEWORK = 'framework',
   DATABASE = 'database',
   TOOL = 'tool',
   CLOUD_PLATFORM = 'cloud_platform',
   METHODOLOGY = 'methodology',
   SOFT_SKILL = 'soft_skill',
   CERTIFICATION = 'certification',
   OTHER = 'other'
}

@Entity('skill')
@Index(['category'])
@Index(['isActive'])
@Index(['canonicalName'], { unique: true })
export class SkillEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the skill'
   })
   @ApiProperty({
      description: 'Unique identifier for the skill',
      example: 1
   })
   skillId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Canonical name of the skill (standardized form)'
   })
   @ApiProperty({
      description: 'Canonical name of the skill (standardized form)',
      example: 'PostgreSQL'
   })
   canonicalName: string;

   @Column({
      type: 'varchar',
      length: 500,
      nullable: true,
      comment: 'Description of the skill'
   })
   @ApiPropertyOptional({
      description: 'Description of the skill',
      example: 'Open-source relational database management system'
   })
   description?: string;

   @Column({
      type: 'enum',
      enum: SkillCategory,
      nullable: false,
      comment: 'Category of the skill'
   })
   @ApiProperty({
      description: 'Category of the skill',
      enum: SkillCategory,
      example: SkillCategory.DATABASE
   })
   category: SkillCategory;

   @Column({
      type: 'boolean',
      default: true,
      comment: 'Whether the skill is active and should be used for matching'
   })
   @ApiProperty({
      description: 'Whether the skill is active and should be used for matching',
      example: true
   })
   isActive: boolean;

   // Optional embedding for semantic skill matching
   @Column({
      type: 'varchar', // Will be migrated to vector(768) in migration
      nullable: true,
      comment: 'Vector embedding of the skill name and description for semantic matching'
   })
   @ApiPropertyOptional({
      description: 'Vector embedding of the skill name and description for semantic matching',
      example: '[0.1, -0.2, 0.3, ...]'
   })
   embedding?: string;

   @Column({
      type: 'int',
      default: 0,
      comment: 'Priority/weight of the skill for matching (higher = more important)'
   })
   @ApiProperty({
      description: 'Priority/weight of the skill for matching (higher = more important)',
      example: 5
   })
   priority: number;

   @Column({
      type: 'jsonb',
      nullable: true,
      comment: 'Additional metadata about the skill'
   })
   @ApiPropertyOptional({
      description: 'Additional metadata about the skill',
      example: {
         relatedSkills: ['MySQL', 'MongoDB'],
         versions: ['12', '13', '14', '15'],
         officialUrl: 'https://www.postgresql.org/'
      }
   })
   metadata?: any;

   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'When the skill was created'
   })
   @ApiProperty({
      description: 'When the skill was created',
      example: '2024-01-15T10:30:00Z'
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'When the skill was last updated'
   })
   @ApiProperty({
      description: 'When the skill was last updated',
      example: '2024-01-15T10:30:00Z'
   })
   updatedAt: Date;

   // Relations
   @OneToMany('SkillAliasEntity', 'skill')
   aliases: any[];
}
