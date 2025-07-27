import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('position')
export class PositionEntity {
   @PrimaryGeneratedColumn('identity')
   positionId: number;

   @Column({ nullable: true })
   positionName: string;
}
