import { Module } from '@nestjs/common';
import { PermissionModule } from './permission/permission.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtCoreModule } from '@/app/configs/jwt/jwt.module';
import { JwtStrategy } from './strategy/jwt-strategy.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '@/entities/master/permission.entity';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { EmployeeController } from '../employee/employee.controller';
import { LocalStrategy } from './strategy/local-strategy.strategy';
import { RefreshStrategy } from './strategy/refresh-strategy.strategy';
import { SessionEntity } from '@/entities/transaction/session.entity';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { EmailService } from '@/utils/email/email.service';

@Module({
   imports: [
      TypeOrmModule.forFeature([EmployeeEntity, PermissionEntity, SessionEntity]),
      PermissionModule,
      JwtCoreModule.register(),
      //repositories
   ],

   providers: [
      /**Repository */
      EmployeeRepository,
      PermissionRepository,
      /**Service */
      AuthService,
      EmailService,
      /**Strategy */
      JwtStrategy,
      LocalStrategy,
      RefreshStrategy,
   ],
   controllers: [AuthController, EmployeeController],
   exports: [JwtStrategy, LocalStrategy, RefreshStrategy],
})
export class AuthModule {}
