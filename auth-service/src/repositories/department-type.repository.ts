import { DepartmentTypeEntity } from '../entities/master/department-type.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DepartmentTypeRepository {
   constructor(
      @InjectRepository(DepartmentTypeEntity)
      private departmentTypeRepository: Repository<DepartmentTypeEntity>,
   ) {}
}
