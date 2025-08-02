import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/request/create-entity-req.dto';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { PermissionRepository } from '@/repositories/permission.repository';
import { EmailService } from '@/utils/email/email.service';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { GetEmployeeReqDto } from './dto/request/get-employee-req.dto';
import { pickMapper } from '@/utils/query/pick.query';

@Injectable()
export class EmployeeService {
   constructor(
      private readonly permissionRepository: PermissionRepository,
      private readonly emailService: EmailService,
      private readonly employeeRepository: EmployeeRepository,
   ) {}

   async getEmployeeByFilter(dto: GetEmployeeReqDto): Promise<{
      total: number;
      data: EmployeeEntity[];
   }> {
      return await this.employeeRepository.findAll(dto);
   }

   async createEmployee(dto: CreateEmployeeDto): Promise<EmployeeEntity> {
      const { permissions, positionId, positionTypeId, departmentId, ...employeeInfo } = dto;
      const permissionEntityList =
         await this.permissionRepository.findPermissionsByListId(permissions);
      if (!permissionEntityList || permissionEntityList.length === 0) {
         throw new NotFoundException('No valid permissions found for the provided IDs');
      }

      const newEmployee = await this.employeeRepository.createEmployee({
         ...employeeInfo,
         positionId: positionId,
         positionTypeId: positionTypeId,
         permissions: permissionEntityList,
         departmentId: departmentId,
      } as EmployeeEntity);
      const OTP = Math.floor(100000 + Math.random() * 899999);
      this.emailService.sendUserConfirmation(newEmployee, OTP.toString());
      return newEmployee;
   }
}
