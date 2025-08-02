import { HeadquarterEntity } from '@/entities/master/headquarter.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
   imports: [TypeOrmModule.forFeature([HeadquarterEntity])],
   controllers: [],
   providers: [],
   exports: [],
})
export class HeadquarterModule {}
