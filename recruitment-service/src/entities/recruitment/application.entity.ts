import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';

@Entity('application')
@Index(['status'])
@Index(['appliedDate'])
@Index(['jobPostingId', 'candidateId'], { unique: true })
export class ApplicationEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the application'
   })
   applicationId: number;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Cover letter submitted by candidate'
   })
   coverLetter?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'URL to resume file for this specific application'
   })
   resumeUrl?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      default: 'submitted',
      comment: 'Application status (submitted, screening, interviewing, offer, hired, rejected, withdrawn)'
   })
   status: string;

   @Column({
      type: 'timestamp',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'Date when application was submitted'
   })
   appliedDate: Date;

   @Column({
      type: 'timestamp',
      nullable: true,
      comment: 'Date when application was reviewed'
   })
   reviewedDate?: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Notes from reviewer'
   })
   reviewNotes?: string;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Overall application score (1-10)'
   })
   score?: number;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Feedback on the application'
   })
   feedback?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Date when offer was made'
   })
   offerDate?: Date;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Salary offered (VND)'
   })
   offeredSalary?: number;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Offer expiration date'
   })
   offerExpiryDate?: Date;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Offer status (pending, accepted, rejected, expired)'
   })
   offerStatus?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Date when offer was responded to'
   })
   offerResponseDate?: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Reason for rejection (if applicable)'
   })
   rejectionReason?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Expected start date if hired'
   })
   expectedStartDate?: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Additional notes about the application'
   })
   applicationNotes?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Priority level (low, medium, high, urgent)'
   })
   priority?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Tags for categorization (JSON array)'
   })
   tags?: string;

   // Foreign Keys
   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to job posting'
   })
   jobPostingId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to candidate'
   })
   candidateId: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to employee who reviewed application (User Service)'
   })
   reviewedBy?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to hiring manager (User Service)'
   })
   hiringManagerId?: number;

   // CV Screening fields
   @Column({
      type: 'boolean',
      default: false,
      comment: 'Whether CV screening has been completed'
   })
   isScreeningCompleted: boolean;

   @Column({
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: 'Overall CV screening score (0-100)'
   })
   screeningScore?: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'CV screening status (pending, processing, completed, failed)'
   })
   screeningStatus?: string;

   @Column({
      type: 'timestamp',
      nullable: true,
      comment: 'When CV screening was completed'
   })
   screeningCompletedAt?: Date;

   // Relationships will be added after all entities are created
   // @ManyToOne(() => JobPostingEntity, jobPosting => jobPosting.applications, {
   //    onDelete: 'CASCADE'
   // })
   // @JoinColumn({ name: 'jobPostingId' })
   // jobPosting: JobPostingEntity;

   // @ManyToOne(() => CandidateEntity, candidate => candidate.applications, {
   //    onDelete: 'CASCADE'
   // })
   // @JoinColumn({ name: 'candidateId' })
   // candidate: CandidateEntity;

   // @OneToMany(() => InterviewEntity, interview => interview.application, {
   //    cascade: ['soft-remove']
   // })
   // interviews: InterviewEntity[];

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
         'submitted': 'blue',
         'screening': 'yellow',
         'interviewing': 'orange',
         'offer': 'purple',
         'hired': 'green',
         'rejected': 'red',
         'withdrawn': 'gray'
      };
      return statusColors[this.status] || 'gray';
   }
}
