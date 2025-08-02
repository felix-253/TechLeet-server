import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
   imports: [AuthModule, EmployeeModule],
})
export class CoreModule {}
