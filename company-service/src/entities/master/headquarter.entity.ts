import { Column, Entity, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { DepartmentEntity } from './department.entity';

@Entity('headquarter')
@Index(['headquarterEmail'], { unique: true })
@Index(['headquarterName'], { unique: true })
export class HeadquarterEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the headquarter'
   })
   headquarterId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Name of the headquarter or office'
   })
   headquarterName: string;

   @Column({
      type: 'text',
      nullable: false,
      comment: 'Physical address of the headquarter'
   })
   headquarterAddress: string;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: false,
      comment: 'Contact phone number'
   })
   headquarterPhone: string;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Contact email address'
   })
   headquarterEmail: string;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: 'City where headquarter is located (Vietnam)'
   })
   city: string;

   @Column({
      type: 'varchar',
      length: 10,
      nullable: true,
      comment: 'Postal code'
   })
   postalCode?: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Additional description or notes about the location'
   })
   description?: string;

   @Column({
      type: 'boolean',
      default: false,
      comment: 'Whether this is the main headquarters'
   })
   isMainHeadquarter: boolean;

   // Relationships
   @OneToMany(() => DepartmentEntity, department => department.headquarter, {
      cascade: ['soft-remove']
   })
   departments: DepartmentEntity[];
}
