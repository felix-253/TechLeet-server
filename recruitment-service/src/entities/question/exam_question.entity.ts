import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ExaminationEntity } from './examination.entity';
import { QuestionEntity } from './question.entity';
import { BaseQuestionEntity } from '../base/question-base.entity';

@Entity('examination_questions')
@Unique(['examinationId', 'questionId'])
export class ExamQuestionEntity extends BaseQuestionEntity {
   @PrimaryGeneratedColumn('increment', {
      name: 'examination_question_id',
      comment: 'Unique identifier for the examination question',
   })
   examinationQuestionId: number;

   @Column({
      type: 'int',
      name: 'examination_id',
      nullable: false,
      comment: 'Reference to examination',
   })
   examinationId: number;

   @Column({
      type: 'int',
      name: 'question_id',
      nullable: false,
      comment: 'Reference to question',
   })
   questionId: number;

   @Column({
      type: 'text',
      name: 'answer_text',
      nullable: true,
      comment: 'Answer text for the question',
   })
   answerText?: string;

   @Column({
      type: 'float',
      name: 'score',
      nullable: true,
      comment: 'Score for the answer',
   })
   score?: number;

   @Column({
      type: 'text',
      name: 'reason',
      nullable: true,
      comment: 'Reason for the score',
   })
   reason?: string;

   // Relationships
   @ManyToOne(() => ExaminationEntity, (examination) => examination.examQuestions, {
      onDelete: 'CASCADE',
   })
   @JoinColumn({ name: 'examination_id' })
   examination: ExaminationEntity;

   @ManyToOne(() => QuestionEntity, (question) => question.examQuestions, {
      onDelete: 'CASCADE',
   })
   @JoinColumn({ name: 'question_id' })
   question: QuestionEntity;
}
