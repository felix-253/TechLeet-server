import { DepartmentEntity } from '@/entities/master/department.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DepartmentRepository {
   constructor(
      @InjectRepository(DepartmentEntity)
      private departmentRepository: Repository<DepartmentEntity>,
   ) {}
}
