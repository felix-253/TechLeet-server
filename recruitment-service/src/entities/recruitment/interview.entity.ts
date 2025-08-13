import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';

@Entity('interview')
@Index(['scheduledDate'])
@Index(['status'])
@Index(['interviewType'])
export class InterviewEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the interview'
   })
   interviewId: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: 'Type of interview (phone, video, onsite, technical, hr, final)'
   })
   interviewType: string;

   @Column({
      type: 'timestamp',
      nullable: false,
      comment: 'Scheduled date and time for the interview'
   })
   scheduledDate: Date;

   @Column({
      type: 'int',
      nullable: false,
      default: 60,
      comment: 'Interview duration in minutes'
   })
   durationMinutes: number;

   @Column({
      type: 'varchar',
      length: 200,
      nullable: true,
      comment: 'Interview location or address'
   })
   location?: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'Video meeting link (Zoom, Teams, etc.)'
   })
   meetingLink?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      default: 'scheduled',
      comment: 'Interview status (scheduled, confirmed, in-progress, completed, cancelled, no-show)'
   })
   status: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Interview agenda or topics to cover'
   })
   agenda?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Notes taken during the interview'
   })
   interviewNotes?: string;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Overall interview score (1-10)'
   })
   score?: number;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Detailed feedback from interviewer'
   })
   feedback?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Interview result (pass, fail, pending, strong-pass, weak-pass)'
   })
   result?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Strengths observed during interview'
   })
   strengths?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Areas for improvement or concerns'
   })
   weaknesses?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Technical skills assessment'
   })
   technicalAssessment?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Communication skills assessment'
   })
   communicationAssessment?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Cultural fit assessment'
   })
   culturalFitAssessment?: string;

   @Column({
      type: 'boolean',
      nullable: true,
      comment: 'Whether interviewer recommends candidate for next round'
   })
   recommendForNextRound?: boolean;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Questions asked during the interview'
   })
   questionsAsked?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Candidate questions and concerns'
   })
   candidateQuestions?: string;

   @Column({
      type: 'timestamp',
      nullable: true,
      comment: 'Actual start time of the interview'
   })
   actualStartTime?: Date;

   @Column({
      type: 'timestamp',
      nullable: true,
      comment: 'Actual end time of the interview'
   })
   actualEndTime?: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Reason for cancellation (if applicable)'
   })
   cancellationReason?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Follow-up actions required'
   })
   followUpActions?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Additional notes or comments'
   })
   additionalNotes?: string;

   // Foreign Keys
   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to application'
   })
   applicationId: number;

   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to interviewer employee (User Service)'
   })
   interviewerId: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to secondary interviewer (User Service)'
   })
   secondaryInterviewerId?: number;

   // Relationships will be added after all entities are created
   // @ManyToOne(() => ApplicationEntity, application => application.interviews, {
   //    onDelete: 'CASCADE'
   // })
   // @JoinColumn({ name: 'applicationId' })
   // application: ApplicationEntity;

   // Computed properties
   get actualDurationMinutes(): number | null {
      if (!this.actualStartTime || !this.actualEndTime) return null;
      const diffMs = this.actualEndTime.getTime() - this.actualStartTime.getTime();
      return Math.round(diffMs / (1000 * 60));
   }

   get isUpcoming(): boolean {
      return this.status === 'scheduled' && new Date(this.scheduledDate) > new Date();
   }

   get isOverdue(): boolean {
      return this.status === 'scheduled' && new Date(this.scheduledDate) < new Date();
   }

   get hoursUntilInterview(): number | null {
      if (!this.isUpcoming) return null;
      const now = new Date();
      const scheduled = new Date(this.scheduledDate);
      const diffMs = scheduled.getTime() - now.getTime();
      return Math.round(diffMs / (1000 * 60 * 60));
   }

   get formattedScheduledTime(): string {
      return new Intl.DateTimeFormat('vi-VN', {
         year: 'numeric',
         month: '2-digit',
         day: '2-digit',
         hour: '2-digit',
         minute: '2-digit',
         timeZone: 'Asia/Ho_Chi_Minh'
      }).format(new Date(this.scheduledDate));
   }

   get statusColor(): string {
      const statusColors = {
         'scheduled': 'blue',
         'confirmed': 'green',
         'in-progress': 'yellow',
         'completed': 'green',
         'cancelled': 'red',
         'no-show': 'red'
      };
      return statusColors[this.status] || 'gray';
   }

   get resultColor(): string {
      const resultColors = {
         'pass': 'green',
         'strong-pass': 'green',
         'weak-pass': 'yellow',
         'fail': 'red',
         'pending': 'gray'
      };
      return resultColors[this.result as keyof typeof resultColors] || 'gray';
   }
}
