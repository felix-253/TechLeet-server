import { Column, Entity, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import { BaseQuestionEntity } from '../base/question-base.entity';
import { QuestionSetItemEntity } from './question_set_item.entity';

@Entity('question_sets')
@Index(['title'], { unique: true })
export class QuestionSetEntity extends BaseQuestionEntity {
   @PrimaryGeneratedColumn('increment', {
      name: 'set_id',
      comment: 'Unique identifier for the question set',
   })
   setId: number;

   @Column({
      type: 'varchar',
      length: 255,
      name: 'title',
      nullable: false,
      unique: true,
      comment: 'Title of the question set',
   })
   title: string;

   @Column({
      type: 'text',
      name: 'description',
      nullable: true,
      comment: 'Description of the question set',
   })
   description?: string;

   @OneToMany(() => QuestionSetItemEntity, (questionSetItem) => questionSetItem.questionSet)
   questionSetItems: QuestionSetItemEntity[];
}
