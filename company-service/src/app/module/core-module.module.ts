import { Module } from '@nestjs/common';
import { HeadquarterModule } from './headquarter/headquarter.module';
import { DepartmentModule } from './department/department.module';
import { PositionModule } from './position/position.module';

@Module({
   imports: [
      HeadquarterModule,
      DepartmentModule,
      PositionModule,
   ],
})
export class CoreModuleModule {}
