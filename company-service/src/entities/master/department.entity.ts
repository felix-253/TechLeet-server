import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { HeadquarterEntity } from './headquarter.entity';
import { DepartmentTypeEntity } from './department-type.entity';

@Entity('department')
@Index(['departmentName'], { unique: true })
export class DepartmentEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the department'
   })
   departmentId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      comment: 'Name of the department'
   })
   departmentName: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Description of department responsibilities'
   })
   description?: string;

   @Column({
      type: 'decimal',
      precision: 15,
      scale: 2,
      nullable: true,
      comment: 'Annual budget allocated to department'
   })
   budget?: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Department code for internal reference'
   })
   departmentCode?: string;

   // Foreign Keys
   @Column({
      type: 'int',
      nullable: false,
      comment: 'Reference to headquarter this department belongs to'
   })
   headquarterId: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to department type'
   })
   departmentTypeId?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to employee who leads this department'
   })
   leaderId?: number;

   // Relationships
   @ManyToOne(() => HeadquarterEntity, headquarter => headquarter.departments, {
      onDelete: 'CASCADE'
   })
   @JoinColumn({ name: 'headquarterId' })
   headquarter: HeadquarterEntity;

   @ManyToOne(() => DepartmentTypeEntity, departmentType => departmentType.departments, {
      onDelete: 'SET NULL'
   })
   @JoinColumn({ name: 'departmentTypeId' })
   departmentType?: DepartmentTypeEntity;

   // Note: Employee relationship will be handled via User Service
   // We'll store leaderId as foreign key but not create TypeORM relationship
   // to avoid circular dependencies between services
}
