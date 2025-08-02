import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { PermissionEntity } from '@/entities/master/permission.entity';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { EmailService } from '@/utils/email/email.service';

@Module({
   imports: [TypeOrmModule.forFeature([EmployeeEntity, PermissionEntity])],
   providers: [EmployeeService, EmployeeRepository, PermissionRepository, EmailService],
   controllers: [EmployeeController],
   exports: [EmployeeService],
})
export class EmployeeModule {}
