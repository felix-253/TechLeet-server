import { Column, Entity, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { PositionEntity } from './position.entity';

@Entity('position_type')
@Index(['positionTypeName'], { unique: true })
export class PositionTypeEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the position type'
   })
   positionTypeId: number;

   @Column({
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: 'Name of the position type'
   })
   positionTypeName: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Description of the position type'
   })
   description?: string;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: 'Code for the position type'
   })
   typeCode?: string;

   @Column({
      type: 'int',
      nullable: true,
      default: 0,
      comment: 'Sort order for display purposes'
   })
   sortOrder?: number;

   @Column({
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: 'Category of position type (e.g., Technical, Management, Support)'
   })
   category?: string;

   // Relationships
   @OneToMany(() => PositionEntity, position => position.positionType, {
      cascade: ['soft-remove']
   })
   positions: PositionEntity[];
}
