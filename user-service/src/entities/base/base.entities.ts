import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class BaseEntity {
   @CreateDateColumn({
      default: () => 'CURRENT_TIMESTAMP', // UTC
   })
   createdAt?: Date;
   @UpdateDateColumn({
      default: () => "CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'",
   })
   updatedAt?: Date;

   @Column({ default: false })
   isDeleted?: boolean;
}
