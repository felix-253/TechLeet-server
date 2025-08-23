import { Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export abstract class BaseEntity {
   @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'Record creation timestamp'
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'Record last update timestamp'
   })
   updatedAt: Date;

   @DeleteDateColumn({
      type: 'timestamp',
      nullable: true,
      comment: 'Soft delete timestamp'
   })
   deletedAt?: Date;

   @Column({
      type: 'boolean',
      default: true,
      comment: 'Whether this record is active'
   })
   isActive: boolean;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Additional notes or comments'
   })
   notes?: string;
}
