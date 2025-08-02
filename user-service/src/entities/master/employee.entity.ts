import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { PermissionEntity } from './permission.entity';

@Entity('employee')
export class EmployeeEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity')
   employeeId?: number;

   @Column({ nullable: true })
   firstName: string;
   @Column({ nullable: true })
   lastName: string;
   @Column({ nullable: true })
   address: string;
   @Column({ nullable: true })
   birthDate: Date;
   @Column({ nullable: true, unique: true })
   email: string;
   @Column({ nullable: true })
   password?: string;
   @Column({ nullable: true })
   gender: boolean;
   @Column({ nullable: true })
   startDate?: Date;
   @Column({ type: 'boolean', default: true })
   isActive?: boolean;
   @Column({ nullable: true })
   avatarUrl?: string;
   @Column({ nullable: true })
   phoneNumber: string;
   @Column({ nullable: true })
   baseSalary: number;
   /**
    * relationships
    */
   @Column({ nullable: true })
   departmentId: number;
   @Column({ nullable: true })
   positionId: number;
   @Column({ nullable: true })
   positionTypeId: number;

   @ManyToMany(() => PermissionEntity, (permission) => permission.permissionId)
   @JoinTable({
      name: 'employee_permissions',
      joinColumn: {
         name: 'employeeId',
         referencedColumnName: 'employeeId',
      },
      inverseJoinColumn: {
         name: 'permissionId',
         referencedColumnName: 'permissionId',
      },
   })
   permissions?: PermissionEntity[];
}
