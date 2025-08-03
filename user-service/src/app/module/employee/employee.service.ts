import {
   BadRequestException,
   Injectable,
   InternalServerErrorException,
   NotFoundException,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/request/create-entity-req.dto';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { PermissionRepository } from '@/repositories/permission.repository';
import { EmailService } from '@/utils/email/email.service';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { GetEmployeeReqDto } from './dto/request/get-employee-req.dto';
import { pickMapper } from '@/utils/query/pick.query';
import { UpdateEmployeeDto } from './dto/request/update-employee-req.dto';
import { IAuthInterceptor } from '@/common/types';

@Injectable()
export class EmployeeService {
   constructor(
      private readonly permissionRepository: PermissionRepository,
      private readonly emailService: EmailService,
      private readonly employeeRepository: EmployeeRepository,
   ) {}

   async myProfile(dto: IAuthInterceptor): Promise<EmployeeEntity> {
      try {
         const userFound = await this.employeeRepository.findById(dto.employeeId);
         if (!userFound) throw new NotFoundException('Not found this user');
         return userFound;
      } catch (error) {
         throw new InternalServerErrorException(error);
      }
   }

   async getEmployeeByFilter(dto: GetEmployeeReqDto): Promise<{
      total: number;
      data: EmployeeEntity[];
   }> {
      try {
         return await this.employeeRepository.findAll(dto);
      } catch (error) {
         throw new InternalServerErrorException(error);
      }
   }

   async createEmployee(dto: CreateEmployeeDto): Promise<EmployeeEntity> {
      try {
         const { permissions, ...employeeInfo } = dto;
         const permissionEntityList =
            await this.permissionRepository.findPermissionsByListId(permissions);
         if (!permissionEntityList || permissionEntityList.length === 0) {
            throw new NotFoundException('No valid permissions found for the provided IDs');
         }

         const newEmployee = await this.employeeRepository.createEmployee({
            ...employeeInfo,
            permissions: permissionEntityList,
         } as EmployeeEntity);
         const OTP = Math.floor(100000 + Math.random() * 899999);
         this.emailService.sendUserConfirmation(newEmployee, OTP.toString());
         return newEmployee;
      } catch (error) {
         throw new InternalServerErrorException(error);
      }
   }

   async updateEmployee(dto: UpdateEmployeeDto): Promise<EmployeeEntity> {
      try {
         const { employeeId, permissions, ...dataUpdate } = dto;

         const foundEmployee = await this.employeeRepository.findById(employeeId);
         if (!foundEmployee) throw new NotFoundException('Not found employee');
         const permissionEntityList =
            await this.permissionRepository.findPermissionsByListId(permissions);
         if (!permissionEntityList || permissionEntityList.length === 0) {
            throw new NotFoundException('No valid permissions found for the provided IDs');
         }
         const updateResult = await this.employeeRepository.updateEmployee(
            Object.assign(foundEmployee, ...permissions, dataUpdate),
         );
         return updateResult;
      } catch (error) {
         throw new InternalServerErrorException(error);
      }
   }
}
