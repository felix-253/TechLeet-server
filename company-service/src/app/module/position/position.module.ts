import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { PositionEntity } from '../../../entities/master/position.entity';
import { PositionTypeEntity } from '../../../entities/master/position-type.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
         PositionEntity,
         PositionTypeEntity,
      ]),
   ],
   controllers: [PositionController],
   providers: [PositionService],
   exports: [PositionService],
})
export class PositionModule {}
