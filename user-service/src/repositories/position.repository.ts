import { PositionEntity } from '@/entities/master/position.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PositionRepository {
   constructor(
      @InjectRepository(PositionEntity)
      private positionRepository: Repository<PositionEntity>,
   ) {}
}
