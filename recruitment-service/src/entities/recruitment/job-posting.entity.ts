import { Column, Entity, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { FilterScoreEntity } from './filter-score.entity';
import { QuestionSetEntity } from '../question/question_set.entity';
import { ApplicationEntity } from './application.entity';

@Entity('job_posting')
@Index(['title'])
@Index(['status'])
@Index(['applicationDeadline'])
export class JobPostingEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the job posting',
   })
   jobPostingId: number;

   @Column({
      type: 'varchar',
      length: 200,
      nullable: false,
      comment: 'Job posting title',
   })
   title: string;

   @Column({
      type: 'text',
      nullable: false,
      comment: 'Detailed job description',
   })
   description: string;

   @Column({
      type: 'text',
      nullable: false,
      comment: 'Job requirements and qualifications',
   })
   requirements: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Benefits and perks offered',
   })
   benefits?: string;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Minimum salary offered (VND)',
   })
   salaryMin?: number;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Maximum salary offered (VND)',
   })
   salaryMax?: number;

   @Column({
      type: 'int',
      nullable: false,
      default: 1,
      comment: 'Number of open positions',
   })
   vacancies: number;

   @Column({
      type: 'date',
      nullable: false,
      comment: 'Application deadline',
   })
   applicationDeadline: Date;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      default: 'draft',
      comment: 'Job posting status (draft, published, closed, cancelled)',
   })
   status: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'Work location or remote',
   })
   location?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Employment type (full-time, part-time, contract, internship)',
   })
   employmentType?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Experience level required (entry, junior, senior, lead, manager)',
   })
   experienceLevel?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Required skills (comma-separated or JSON)',
   })
   skills?: string;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Minimum years of experience required',
   })
   minExperience?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Maximum years of experience preferred',
   })
   maxExperience?: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: 'Education level required',
   })
   educationLevel?: string;

   @Column({
      type: 'boolean',
      name: 'isTest',
      nullable: false,
      default: false,
      comment: 'Indicates whether the job requires a test',
   })
   isTest: boolean;

   @Column({
      type: 'int',
      name: 'question_set_id',
      nullable: true,
      comment: 'Reference to question set used for this job',
   })
   questionSetId?: number;

   @Column({
      type: 'int',
      name: 'quantityquestion',
      nullable: true,
      comment: 'Number of questions for this job',
   })
   quantityQuestion?: number;

   @Column({
      type: 'int',
      name: 'min_score',
      nullable: true,
      comment: 'Minimum score required for this job',
   })
   minScore?: number;

   // Foreign Keys (references to Company Service and User Service)
   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to department (Company Service)',
   })
   departmentId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to position (Company Service)',
   })
   positionId: number;

   @ManyToOne(() => QuestionSetEntity, { nullable: true, onDelete: 'SET NULL' })
   @JoinColumn({
      name: 'question_set_id',
      referencedColumnName: 'setId',
      foreignKeyConstraintName: 'fk_job_posting_question_set',
   })
   questionSet?: QuestionSetEntity;

   // Relations
   @OneToMany(() => ApplicationEntity, (application) => application.jobPosting)
   applications?: ApplicationEntity[];

   // Computed properties
   get salaryRange(): string | null {
      if (this.salaryMin && this.salaryMax) {
         const formatSalary = (amount: number): string => {
            return new Intl.NumberFormat('vi-VN').format(amount);
         };
         return `${formatSalary(this.salaryMin)} - ${formatSalary(this.salaryMax)} VND`;
      } else if (this.salaryMin) {
         return `From ${new Intl.NumberFormat('vi-VN').format(this.salaryMin)} VND`;
      } else if (this.salaryMax) {
         return `Up to ${new Intl.NumberFormat('vi-VN').format(this.salaryMax)} VND`;
      }
      return null;
   }

   get isJobActive(): boolean {
      return this.status === 'published' && new Date() <= new Date(this.applicationDeadline);
   }

   get daysUntilDeadline(): number {
      const today = new Date();
      const deadline = new Date(this.applicationDeadline);
      const diffTime = deadline.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
   }
}
