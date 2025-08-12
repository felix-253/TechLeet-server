import { Column, Entity, PrimaryGeneratedColumn, ManyToMany, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { TYPE_PERMISSION_ENUM } from './enum/permission.enum';
import { EmployeeEntity } from './employee.entity';

@Entity('permission')
@Index(['permissionName'], { unique: true })
export class PermissionEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the permission'
   })
   permissionId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Name of the permission'
   })
   permissionName: string;

   @Column({
      type: 'enum',
      enum: TYPE_PERMISSION_ENUM,
      nullable: false,
      comment: 'Type of permission'
   })
   permissionType: TYPE_PERMISSION_ENUM;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Description of what this permission allows'
   })
   description?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Resource this permission applies to'
   })
   resource?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Action this permission allows (create, read, update, delete)'
   })
   action?: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Category or module this permission belongs to'
   })
   category?: string;

   // Foreign Keys (references to Company Service entities)
   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to department (Company Service) - null means all departments'
   })
   departmentId?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to headquarter (Company Service) - null means all headquarters'
   })
   headquarterId?: number;

   // Relationships
   @ManyToMany(() => EmployeeEntity, employee => employee.permissions)
   employees: EmployeeEntity[];
}
