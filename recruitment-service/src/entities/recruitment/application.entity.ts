import { Column, Entity, PrimaryGeneratedColumn, Index, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { ExaminationEntity } from '../question/examination.entity';
import { JobPostingEntity } from './job-posting.entity';
import { CandidateEntity } from './candidate.entity';

@Entity('application')
@Index(['status'])
@Index(['appliedDate'])
@Index(['jobPostingId', 'candidateId'], { unique: true })
export class ApplicationEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the application',
   })
   applicationId: number;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Cover letter submitted by candidate',
   })
   coverLetter?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'URL to resume file for this specific application',
   })
   resumeUrl?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      default: 'submitted',
      comment:
         'Application status (submitted, screening, interviewing, offer, hired, rejected, withdrawn, passed_exam, failed_exam)',
   })
   status: string;

   @Column({
      type: 'timestamp',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'Date when application was submitted',
   })
   appliedDate: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Notes from reviewer',
   })
   reviewNotes?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Date when offer was made',
   })
   offerDate?: Date;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Salary offered (VND)',
   })
   offeredSalary?: number;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Offer expiration date',
   })
   offerExpiryDate?: Date;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Offer status (pending, accepted, rejected, expired)',
   })
   offerStatus?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Date when offer was responded to',
   })
   offerResponseDate?: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Reason for rejection (if applicable)',
   })
   rejectionReason?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Expected start date if hired',
   })
   expectedStartDate?: Date;

   // Foreign Keys
   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to job posting',
   })
   jobPostingId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to candidate',
   })
   candidateId: number;

   // CV Screening fields
   @Column({
      type: 'boolean',
      default: false,
      comment: 'Whether CV screening has been completed',
   })
   isScreeningCompleted: boolean;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: 'Overall CV screening score (0-100)',
   })
   screeningScore?: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'CV screening status (pending, processing, completed, failed)',
   })
   screeningStatus?: string;

   @Column({
      type: 'timestamp',
      nullable: true,
      comment: 'When CV screening was completed',
   })
   screeningCompletedAt?: Date;

   @OneToOne(() => ExaminationEntity, (examination) => examination.application)
   examination: ExaminationEntity;

   // Relationships
   @ManyToOne(() => JobPostingEntity, (jobPosting) => jobPosting.applications, {
      onDelete: 'CASCADE',
   })
   @JoinColumn({ name: 'jobPostingId' })
   jobPosting?: JobPostingEntity;

   @ManyToOne(() => CandidateEntity, (candidate) => candidate.applications, {
      onDelete: 'CASCADE',
   })
   @JoinColumn({ name: 'candidateId' })
   candidate?: CandidateEntity;

   // Note: InterviewEntity uses candidate_id + job_id for linking, not application_id
   // If direct interview-application relation is needed, add application_id to interviews table

   // Computed properties
   get daysSinceApplied(): number {
      const today = new Date();
      const applied = new Date(this.appliedDate);
      const diffTime = today.getTime() - applied.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
   }

   get formattedOfferedSalary(): string | null {
      if (!this.offeredSalary) return null;
      return new Intl.NumberFormat('vi-VN').format(this.offeredSalary) + ' VND';
   }

   get isOfferActive(): boolean {
      if (!this.offerDate || !this.offerExpiryDate) return false;
      return this.offerStatus === 'pending' && new Date() <= new Date(this.offerExpiryDate);
   }

   get daysUntilOfferExpiry(): number | null {
      if (!this.offerExpiryDate) return null;
      const today = new Date();
      const expiry = new Date(this.offerExpiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
   }

   get statusColor(): string {
      const statusColors = {
         submitted: 'blue',
         screening: 'yellow',
         interviewing: 'orange',
         offer: 'purple',
         hired: 'green',
         rejected: 'red',
         withdrawn: 'gray',
         passed_exam: 'green',
         failed_exam: 'red',
      };
      return statusColors[this.status] || 'gray';
   }
}
