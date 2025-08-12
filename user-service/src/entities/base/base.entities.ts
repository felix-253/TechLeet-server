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
      type: 'int',
      nullable: true,
      comment: 'ID of user who created this record'
   })
   createdBy?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'ID of user who last updated this record'
   })
   updatedBy?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'ID of user who deleted this record'
   })
   deletedBy?: number;

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
