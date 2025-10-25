import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { JobPostingEntity } from './job-posting.entity';

@Entity('filter_score')
export class FilterScoreEntity {
   @PrimaryGeneratedColumn()
   id: number;

   @Column({ name: 'job_posting_id', type: 'int' })
   jobPostingId: number;

   @Column({ name: 'screening_n', type: 'int', default: 0 })
   screeningN: number;

   @Column({ name: 'screening_mean', type: 'decimal', precision: 10, scale: 3, default: 0.0 })
   screeningMean: number;

   @Column({ name: 'screening_m2', type: 'decimal', precision: 10, scale: 3, default: 0.0 })
   screeningM2: number;

   @Column({ name: 'screening_threshold', type: 'decimal', precision: 10, scale: 3, default: 0.6 })
   screeningThreshold: number;

   @Column({ name: 'screening_k', type: 'decimal', precision: 10, scale: 3, default: 0.5 })
   screeningK: number;

   @Column({
      name: 'screening_min_threshold',
      type: 'decimal',
      precision: 10,
      scale: 3,
      default: 0.0,
   })
   screeningMinThreshold: number;

   @Column({
      name: 'screening_max_threshold',
      type: 'decimal',
      precision: 10,
      scale: 3,
      default: 1.0,
   })
   screeningMaxThreshold: number;

   @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
   createdAt: Date;

   @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
   updatedAt: Date;
}
