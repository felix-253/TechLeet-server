import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('department_type')
export class DepartmentTypeEntity {
   @PrimaryGeneratedColumn('identity')
   departmentTypeId: number;

   @Column({ nullable: true })
   departmentTypeName: number;
}
