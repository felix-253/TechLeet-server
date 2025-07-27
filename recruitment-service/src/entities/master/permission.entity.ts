import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { TYPE_PERMISSION_ENUM } from './enum/permission.enum';

@Entity('permission')
export class PermissionEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity')
   permissionId: number;

   @Column({ nullable: false, enum: TYPE_PERMISSION_ENUM })
   permissionType: TYPE_PERMISSION_ENUM;

   /** relationship */
   @Column({ nullable: true })
   departmentId: number;
   @Column({ nullable: true })
   headquarterId: number;
}
