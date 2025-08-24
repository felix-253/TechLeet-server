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
import { SkillEntity } from './skill.entity';

@Entity('skill_alias')
@Index(['aliasName'])
@Index(['skillId'])
@Index(['aliasName', 'skillId'], { unique: true })
export class SkillAliasEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the skill alias'
   })
   @ApiProperty({
      description: 'Unique identifier for the skill alias',
      example: 1
   })
   aliasId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to the canonical skill'
   })
   @ApiProperty({
      description: 'Reference to the canonical skill',
      example: 1
   })
   skillId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      comment: 'Alternative name/alias for the skill'
   })
   @ApiProperty({
      description: 'Alternative name/alias for the skill',
      example: 'pg'
   })
   aliasName: string;

   @Column({
      type: 'varchar',
      length: 200,
      nullable: true,
      comment: 'Context or notes about this alias'
   })
   @ApiPropertyOptional({
      description: 'Context or notes about this alias',
      example: 'Common abbreviation used in job postings'
   })
   context?: string;

   @Column({
      type: 'boolean',
      default: true,
      comment: 'Whether this alias is active and should be used for matching'
   })
   @ApiProperty({
      description: 'Whether this alias is active and should be used for matching',
      example: true
   })
   isActive: boolean;

   @Column({
      type: 'int',
      default: 1,
      comment: 'Confidence score for this alias mapping (1-10)'
   })
   @ApiProperty({
      description: 'Confidence score for this alias mapping (1-10)',
      example: 9
   })
   confidence: number;

   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'When the alias was created'
   })
   @ApiProperty({
      description: 'When the alias was created',
      example: '2024-01-15T10:30:00Z'
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'When the alias was last updated'
   })
   @ApiProperty({
      description: 'When the alias was last updated',
      example: '2024-01-15T10:30:00Z'
   })
   updatedAt: Date;

   // Relations
   @ManyToOne(() => SkillEntity, skill => skill.aliases)
   @JoinColumn({ name: 'skill_id' })
   skill: SkillEntity;
}
