import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('position_type')
export class PositionTypeEntity {
   @PrimaryGeneratedColumn('identity')
   positionTypeId: number;

   @Column({ nullable: true })
   positionTypeName: string;
}
