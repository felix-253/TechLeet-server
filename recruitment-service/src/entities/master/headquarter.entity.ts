import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('headquarter')
export class HeadquarterEntity {
   @PrimaryGeneratedColumn('identity')
   headquarterId: number;

   @Column({ nullable: true })
   headquarterName: string;
   @Column({ nullable: true })
   headquarterAddress: string;
   @Column({ nullable: true })
   headquarterPhone: string;
   @Column({ nullable: true })
   headquarterEmail: string;
}
