import { PositionTypeEntity } from '../entities/master/position-type.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PositionTypeRepository {
   constructor(
      @InjectRepository(PositionTypeEntity)
      private positionTypeRepository: Repository<PositionTypeEntity>,
   ) {}
}
