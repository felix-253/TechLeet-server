import { HeadquarterEntity } from '../entities/master/headquarter.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class HeadquarterRepository {
   constructor(
      @InjectRepository(HeadquarterEntity)
      private headquarterRepository: Repository<HeadquarterEntity>,
   ) {}
}
