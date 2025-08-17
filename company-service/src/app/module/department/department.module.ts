import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { DepartmentEntity } from '../../../entities/master/department.entity';
import { DepartmentTypeEntity } from '../../../entities/master/department-type.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         DepartmentEntity,
         DepartmentTypeEntity,
      ]),
   ],
   controllers: [DepartmentController],
   providers: [DepartmentService],
   exports: [DepartmentService],
})
export class DepartmentModule {}
