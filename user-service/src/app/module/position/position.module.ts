import { PositionTypeEntity } from '@/entities/master/position-type.entity';
import { PositionEntity } from '@/entities/master/position.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
   imports: [TypeOrmModule.forFeature([PositionEntity, PositionTypeEntity])], // Add your entities here
   controllers: [],
   providers: [],
   exports: [],
})
export class PositionModule {}
