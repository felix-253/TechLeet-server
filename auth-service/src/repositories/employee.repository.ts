import { EmployeeEntity } from '../entities/master/employee.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EmployeeRepository {
   constructor(
      @InjectRepository(EmployeeEntity)
      private readonly employeeRepository: Repository<EmployeeEntity>,
   ) {}

   async employeeLogin(email: string): Promise<EmployeeEntity | null> {
      const employee = this.employeeRepository.findOne({
         where: {
            email: email,
         },
         relations: ['permissions'],
      });
      return employee;
   }

   async createEmployee(dto: EmployeeEntity): Promise<EmployeeEntity> {
      const employeeModel = this.employeeRepository.create(dto);
      const employee = this.employeeRepository.save(employeeModel);
      return employee;
   }

   async updatePassword(employeeId: number, newPassword: string): Promise<boolean> {
      const updatedResult = await this.employeeRepository.update(
         {
            employeeId: employeeId,
         },
         {
            password: newPassword,
         },
      );
      if (updatedResult?.affected && updatedResult?.affected > 0) return true;
      return false;
   }
}
