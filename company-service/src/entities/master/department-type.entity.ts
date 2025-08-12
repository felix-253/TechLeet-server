import { Column, Entity, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { DepartmentEntity } from './department.entity';

@Entity('department_type')
@Index(['departmentTypeName'], { unique: true })
export class DepartmentTypeEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the department type'
   })
   departmentTypeId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Name of the department type'
   })
   departmentTypeName: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Description of the department type'
   })
   description?: string;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: 'Code for the department type'
   })
   typeCode?: string;

   @Column({
      type: 'int',
      nullable: true,
      default: 0,
      comment: 'Sort order for display purposes'
   })
   sortOrder?: number;

   // Relationships
   @OneToMany(() => DepartmentEntity, department => department.departmentType, {
      cascade: ['soft-remove']
   })
   departments: DepartmentEntity[];
}
