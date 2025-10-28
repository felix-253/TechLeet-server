import {
   Column,
   Entity,
   PrimaryGeneratedColumn,
   Index,
   CreateDateColumn,
   OneToOne,
   JoinColumn,
   OneToMany,
   ManyToOne,
} from 'typeorm';
import { ApplicationEntity } from '../recruitment/application.entity';
import { ExamQuestionEntity } from './exam_question.entity';
import { QuestionSetEntity } from './question_set.entity';
import { BaseQuestionEntity } from '../base/question-base.entity';
// import { QuestionSetEntity } from './question_set.entity';
// import { ApplicationEntity } from '../recruitment/application.entity';

@Entity('examinations')
@Index(['status'])
@Index(['applicationId'])
export class ExaminationEntity extends BaseQuestionEntity {
   @PrimaryGeneratedColumn('increment', {
      name: 'examination_id',
      comment: 'Unique identifier for the examination',
   })
   examinationId: number;

   @Column({
      type: 'int',
      name: 'application_id',
      nullable: false,
      comment: 'Reference to application',
   })
   applicationId: number;

   @Column({
      type: 'int',
      name: 'source_set_id',
      nullable: true,
      comment: 'Reference to source question set',
   })
   sourceSetId?: number;

   @Column({
      type: 'varchar',
      length: 50,
      name: 'status',
      nullable: false,
      default: 'pending',
      comment: 'Examination status',
   })
   status: string;

   @Column({
      type: 'timestamp with time zone',
      name: 'submitted_at',
      nullable: true,
      comment: 'Examination submission timestamp',
   })
   submittedAt?: Date;

   @Column({
      type: 'float',
      name: 'total_score',
      nullable: true,
      comment: 'Total score for the examination',
   })
   totalScore?: number;

   @OneToOne(() => ApplicationEntity, (application) => application.examination)
   @JoinColumn({ name: 'application_id' })
   application: ApplicationEntity;

   @OneToMany(() => ExamQuestionEntity, (examQuestion) => examQuestion.examination)
   examQuestions: ExamQuestionEntity[];

   @ManyToOne(() => QuestionSetEntity, { nullable: true })
   @JoinColumn({ name: 'source_set_id' })
   sourceSet: QuestionSetEntity;

   // Relationships
   // @ManyToOne(() => ApplicationEntity, { onDelete: 'CASCADE' })
   // @JoinColumn({ name: 'application_id' })
   // application: ApplicationEntity;

   // @ManyToOne(() => QuestionSetEntity, { nullable: true })
   // @JoinColumn({ name: 'source_set_id' })
   // sourceSet: QuestionSetEntity;
}
