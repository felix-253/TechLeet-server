import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DepartmentModule } from './department/department.module';
import { HeadquarterModule } from './headquarter/headquarter.module';
import { PositionModule } from './position/position.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
   imports: [AuthModule, EmployeeModule, DepartmentModule, HeadquarterModule, PositionModule],
})
export class CoreModule {}
