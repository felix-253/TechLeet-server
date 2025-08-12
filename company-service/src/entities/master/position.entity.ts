import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { PositionTypeEntity } from './position-type.entity';

@Entity('position')
@Index(['positionName'], { unique: true })
export class PositionEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the position'
   })
   positionId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Name of the position'
   })
   positionName: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Detailed description of position responsibilities'
   })
   description?: string;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Minimum salary for this position'
   })
   minSalary?: number;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Maximum salary for this position'
   })
   maxSalary?: number;

   @Column({
      type: 'int',
      nullable: true,
      default: 1,
      comment: 'Position level (1=Entry, 2=Junior, 3=Senior, 4=Lead, 5=Manager)'
   })
   level?: number;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: 'Position code for internal reference'
   })
   positionCode?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Required skills and qualifications'
   })
   requirements?: string;

   // Foreign Keys
   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to position type'
   })
   positionTypeId?: number;

   // Relationships
   @ManyToOne(() => PositionTypeEntity, positionType => positionType.positions, {
      onDelete: 'SET NULL'
   })
   @JoinColumn({ name: 'positionTypeId' })
   positionType?: PositionTypeEntity;
}
