import { GetEmployeeReqDto } from '@/app/module/employee/dto/request/get-employee-req.dto';
import { ApprovalForSearch } from '@/common/types/employee.type';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { deleteCondition } from '@/utils/query/pick.query';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EmployeeRepository {
   constructor(
      @InjectRepository(EmployeeEntity)
      private readonly employeeRepository: Repository<EmployeeEntity>,
   ) {}

   async findAll(query: GetEmployeeReqDto): Promise<{
      total: number;
      data: EmployeeEntity[];
   }> {
      const qb = this.employeeRepository.createQueryBuilder('employee');

      if (query.keyword) {
         qb.andWhere(
            '(employee.firstName ILIKE :keyword OR employee.lastName ILIKE :keyword OR employee.email ILIKE :keyword OR employee.phoneNumber ILIKE :keyword)',
            { keyword: `%${query.keyword}%` },
         );
      }
      if (typeof query.gender === 'boolean') {
         qb.andWhere('employee.gender = :gender', { gender: query.gender });
      }
      if (typeof query.isActive === 'boolean') {
         qb.andWhere('employee.isActive = :isActive', { isActive: query.isActive });
      }
      if (query.departmentId && query.departmentId.length > 0) {
         qb.andWhere('employee.departmentId IN (:...departmentIds)', {
            departmentIds: query.departmentId,
         });
      }

      if (query.positionId && query.positionId.length > 0) {
         qb.andWhere('employee.positionId IN (:...positionIds)', {
            positionIds: query.positionId,
         });
      }

      if (query.positionTypeId && query.positionTypeId.length > 0) {
         qb.andWhere('employee.positionTypeId IN (:...positionTypeIds)', {
            positionTypeIds: query.positionTypeId,
         });
      }

      if (typeof query.baseSalaryFrom === 'number') {
         qb.andWhere('employee.baseSalary >= :baseSalaryFrom', {
            baseSalaryFrom: query.baseSalaryFrom,
         });
      }

      if (typeof query.baseSalaryTo === 'number') {
         qb.andWhere('employee.baseSalary <= :baseSalaryTo', {
            baseSalaryTo: query.baseSalaryTo,
         });
      }
      if (query.startDateFrom) {
         qb.andWhere('employee.startDate >= :startDateFrom', {
            startDateFrom: query.startDateFrom,
         });
      }
      if (query.startDateTo) {
         qb.andWhere('employee.startDate <= :startDateTo', { startDateTo: query.startDateTo });
      }
      if (query.birthDateFrom) {
         qb.andWhere('employee.birthDate >= :birthDateFrom', {
            birthDateFrom: query.birthDateFrom,
         });
      }
      if (query.birthDateTo) {
         qb.andWhere('employee.birthDate <= :birthDateTo', { birthDateTo: query.birthDateTo });
      }
      if (query.sortBy && query.sortOrder) {
         qb.orderBy(`employee.${query.sortBy}`, query.sortOrder.toUpperCase() as 'ASC' | 'DESC');
      } else {
         qb.orderBy('employee.createdAt', 'DESC');
      }
      qb.skip(query.limit * query.page).take(query.limit);
      deleteCondition(qb, 'employee');
      const [data, total] = await qb.getManyAndCount();
      return { data, total };
   }

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
      return this.employeeRepository.save(employeeModel);
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
      if (updatedResult.affected > 0) return true;
      return false;
   }
}
