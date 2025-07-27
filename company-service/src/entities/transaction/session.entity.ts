import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('session')
export class SessionEntity {
   @PrimaryGeneratedColumn('identity')
   sessionId: string;

   @Column({ nullable: true })
   refreshToken: string;

   /** relationship */
   @Column({ nullable: true })
   employeeId: string;
}
