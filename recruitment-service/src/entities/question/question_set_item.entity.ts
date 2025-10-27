import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { QuestionSetEntity } from './question_set.entity';
import { QuestionEntity } from './question.entity';

@Entity('question_set_items')
@Index(['setId', 'questionId'], { unique: true })
export class QuestionSetItemEntity {
   @PrimaryGeneratedColumn('identity', {
      name: 'set_item_id',
      comment: 'Unique identifier for the question set item',
   })
   setItemId: number;

   @Column({
      type: 'int',
      name: 'set_id',
      nullable: false,
      comment: 'Reference to question set',
   })
   setId: number;

   @Column({
      type: 'int',
      name: 'question_id',
      nullable: false,
      comment: 'Reference to question',
   })
   questionId: number;

   // Relationships
   @ManyToOne(() => QuestionSetEntity, { onDelete: 'CASCADE' })
   @JoinColumn({ name: 'set_id' })
   questionSet: QuestionSetEntity;

   @ManyToOne(() => QuestionEntity, { onDelete: 'CASCADE' })
   @JoinColumn({ name: 'question_id' })
   question: QuestionEntity;
}

