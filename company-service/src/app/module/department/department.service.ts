import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { DepartmentEntity } from '../../../entities/master/department.entity';
import { 
   CreateDepartmentDto, 
   UpdateDepartmentDto, 
   GetDepartmentsQueryDto,
   DepartmentResponseDto 
} from './department.dto';

@Injectable()
export class DepartmentService {
   constructor(
      @InjectRepository(DepartmentEntity)
      private readonly departmentRepository: Repository<DepartmentEntity>,
   ) {}

   async create(createDepartmentDto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
      try {
         // Check if department name already exists
         const existingDepartment = await this.departmentRepository.findOne({
            where: { departmentName: createDepartmentDto.departmentName },
         });

         if (existingDepartment) {
            throw new BadRequestException('Department name already exists');
         }

         const department = this.departmentRepository.create(createDepartmentDto);
         const savedDepartment = await this.departmentRepository.save(department);
         
         return this.mapToResponseDto(savedDepartment);
      } catch (error) {
         if (error instanceof BadRequestException) {
            throw error;
         }
         throw new BadRequestException('Failed to create department');
      }
   }

   async findAll(query: GetDepartmentsQueryDto): Promise<{ data: DepartmentResponseDto[]; total: number }> {
      const { page = 0, limit = 10, keyword, sortBy = 'departmentId', sortOrder = 'ASC' } = query;

      const findOptions: FindManyOptions<DepartmentEntity> = {
         skip: page * limit,
         take: limit,
         order: { [sortBy]: sortOrder },
      };

      if (keyword) {
         findOptions.where = {
            departmentName: Like(`%${keyword}%`),
         };
      }

      const [departments, total] = await this.departmentRepository.findAndCount(findOptions);

      return {
         data: departments.map(dept => this.mapToResponseDto(dept)),
         total,
      };
   }

   async findOne(id: number): Promise<DepartmentResponseDto> {
      const department = await this.departmentRepository.findOne({
         where: { departmentId: id },
      });

      if (!department) {
         throw new NotFoundException(`Department with ID ${id} not found`);
      }

      return this.mapToResponseDto(department);
   }

   async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
      const department = await this.departmentRepository.findOne({
         where: { departmentId: id },
      });

      if (!department) {
         throw new NotFoundException(`Department with ID ${id} not found`);
      }

      // Check if new department name already exists (if name is being updated)
      if (updateDepartmentDto.departmentName && updateDepartmentDto.departmentName !== department.departmentName) {
         const existingDepartment = await this.departmentRepository.findOne({
            where: { departmentName: updateDepartmentDto.departmentName },
         });

         if (existingDepartment) {
            throw new BadRequestException('Department name already exists');
         }
      }

      Object.assign(department, updateDepartmentDto);
      const updatedDepartment = await this.departmentRepository.save(department);

      return this.mapToResponseDto(updatedDepartment);
   }

   async remove(id: number): Promise<void> {
      const department = await this.departmentRepository.findOne({
         where: { departmentId: id },
      });

      if (!department) {
         throw new NotFoundException(`Department with ID ${id} not found`);
      }

      await this.departmentRepository.remove(department);
   }

   async findByHeadquarter(headquarterId: number): Promise<DepartmentResponseDto[]> {
      const departments = await this.departmentRepository.find({
         where: { headquarterId },
         order: { departmentName: 'ASC' },
      });

      return departments.map(dept => this.mapToResponseDto(dept));
   }

   async findByType(departmentTypeId: number): Promise<DepartmentResponseDto[]> {
      const departments = await this.departmentRepository.find({
         where: { departmentTypeId },
         order: { departmentName: 'ASC' },
      });

      return departments.map(dept => this.mapToResponseDto(dept));
   }

   private mapToResponseDto(department: DepartmentEntity): DepartmentResponseDto {
      return {
         departmentId: department.departmentId,
         departmentName: department.departmentName,
         headquarterId: department.headquarterId,
         departmentTypeId: department.departmentTypeId,
         leaderId: department.leaderId,
      };
   }
}
