import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseQuestionEntity {
   @CreateDateColumn({
      type: 'timestamp with time zone',
      name: 'created_at',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'Record creation timestamp',
   })
   createdAt: Date;

   @UpdateDateColumn({
      type: 'timestamp',
      name: 'updated_at',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
      comment: 'Record last update timestamp',
   })
   updatedAt: Date;
}
