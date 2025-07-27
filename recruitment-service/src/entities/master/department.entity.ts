import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('department')
export class DepartmentEntity {
   @PrimaryGeneratedColumn('identity')
   departmentId: number;

   @Column({ nullable: true })
   departmentName: string;

   /** relationships */
   @Column({ nullable: true })
   headquarterId: number;
   @Column({ nullable: true })
   departmentTypeId: number;
   @Column({ nullable: true })
   leaderId: number;
}
