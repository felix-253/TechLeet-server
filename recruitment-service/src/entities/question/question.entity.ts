import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseQuestionEntity } from '../base/question-base.entity';
import { DifficultyLevel } from './difficulty-level.enum';

@Entity('questions')
@Index(['difficulty'])
export class QuestionEntity extends BaseQuestionEntity {
   @PrimaryGeneratedColumn('identity', {
      name: 'question_id',
      comment: 'Unique identifier for the question',
   })
   questionId: number;

   @Column({
      type: 'text',
      name: 'content',
      nullable: false,
      comment: 'Question content',
   })
   content: string;

   @Column({
      type: 'text',
      name: 'sample_answer',
      nullable: false,
      comment: 'Sample answer to the question',
   })
   sampleAnswer: string;

   @Column({
      type: 'enum',
      enum: DifficultyLevel,
      name: 'difficulty',
      nullable: false,
      comment: 'Difficulty level of the question',
   })
   difficulty: DifficultyLevel;
}

