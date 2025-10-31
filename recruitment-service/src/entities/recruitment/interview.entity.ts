import {
   Column,
   CreateDateColumn,
   DeleteDateColumn,
   Entity,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';

@Entity('interviews')
export class InterviewEntity {
   @PrimaryGeneratedColumn()
   interview_id: number;

   @Column({ type: 'int' })
   candidate_id: number;

   @Column({ type: 'int' })
   job_id: number;

   @Column({ type: 'int', array: true })
   interviewer_ids: number[];

   @Column({ type: 'int', array: true, nullable: true })
   scores: number[];

   @Column({ type: 'text', array: true, nullable: true })
   comments: string[];

   @Column({ type: 'timestamptz' })
   scheduled_at: Date;

   @Column({ type: 'int', default: 30 })
   duration_minutes: number;

   @Column({ type: 'text' })
   meeting_link: string;

   @Column({ type: 'varchar', length: 255, nullable: true })
   location: string;

   @Column({ type: 'varchar', length: 32, default: 'scheduled' })
   status: string;

   @Column({ type: 'text', nullable: true })
   notes?: string;

   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
   })
   updatedAt: Date;

   @DeleteDateColumn({
      type: 'timestamp',
      nullable: true,
      comment: 'Soft delete timestamp',
   })
   deletedAt?: Date;
}
