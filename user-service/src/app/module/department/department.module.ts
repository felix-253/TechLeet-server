import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentEntity } from '@/entities/master/department.entity';
import { DepartmentTypeEntity } from '@/entities/master/department-type.entity';
import { DepartmentService } from './services/department.service';

@Module({
   imports: [TypeOrmModule.forFeature([DepartmentEntity, DepartmentTypeEntity])],
   providers: [DepartmentService],
})
export class DepartmentModule {}
