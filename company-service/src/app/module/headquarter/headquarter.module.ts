import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeadquarterController } from './headquarter.controller';
import { HeadquarterService } from './headquarter.service';
import { HeadquarterEntity } from '../../../entities/master/headquarter.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([HeadquarterEntity]),
   ],
   controllers: [HeadquarterController],
   providers: [HeadquarterService],
   exports: [HeadquarterService],
})
export class HeadquarterModule {}
