import { EmployeeEntity } from '@/entities/master/employee.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshPayloadJwtDto } from './strategy/dto/refresh-payload-jwt.dto';
import { LoginResDto } from './dto/response/login-res.dto';
import { PayloadJwtDto } from './strategy/dto/payload-jwt.dto';
import { RedisService } from '@/app/configs/redis';
import { TYPE_PERMISSION_ENUM } from '@/entities/master/enum/permission.enum';
import {
   REDIS_KEY_EMPLOYEE_PERMISSION,
   REDIS_KEY_NEW_EMPLOYEE_OTP,
} from '@/common/constants/redis-key.constant';
import { TYPE_EMPLOYEE_PERMISSION_REDIS } from './types/employee-permission-redis.dto';
import { PermissionRepository } from '@/repositories/permission.repository';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { EmailService } from '@/utils/email/email.service';
import { CreatePassword } from './dto/request/create-password-req.dto';
import bcrypt from 'bcryptjs';
@Injectable()
export class AuthService {
   constructor(
      private jwtService: JwtService,
      private readonly redisService: RedisService,
      private readonly employeeRepository: EmployeeRepository,
   ) {}
   async login(employee: EmployeeEntity): Promise<LoginResDto> {
      if (!employee) {
         throw new NotFoundException('Employee not found or invalid credentials');
      }
      
      const permissions = employee.permissions;

      const isAdmin = permissions.find(
         (permission) => permission.permissionType == TYPE_PERMISSION_ENUM.FULL,
      );
      await this.redisService.removeSet(REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId);
      if (isAdmin) {
         await this.redisService.setSet(REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId, [
            { permissionType: TYPE_PERMISSION_ENUM.FULL },
         ]);
      } else {
         const employeePermissionArr: TYPE_EMPLOYEE_PERMISSION_REDIS[] = employee.permissions.map(
            (permission) => {
               return {
                  departmentId: permission.departmentId,
                  headquarterId: permission.headquarterId,
                  permissionType: permission.permissionType,
               } as TYPE_EMPLOYEE_PERMISSION_REDIS;
            },
         );

         this.redisService.setSet(
            REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId,
            employeePermissionArr,
         );
      }

      const payload: PayloadJwtDto = {
         employeeId: employee.employeeId,
      };
      const payloadRefresh: RefreshPayloadJwtDto = {
         employeeId: employee.employeeId,
         isRefresh: true,
      };
      return {
         token: this.jwtService.sign(payload),
         refreshToken: this.jwtService.sign(payloadRefresh, {
            expiresIn: process.env.JWT_REFRESH_TOKEN_TIME,
         }),
         email: employee.email,
         fullName: employee.firstName + ' ' + employee.lastName,
         phoneNumber: employee.phoneNumber,
         avatarUrl: employee.avatarUrl,
         employeeId: employee.employeeId,
      };
   }


   async createPassword(dto: CreatePassword): Promise<{ status: boolean }> {
      const { newPassword, url } = dto;
      const employeeIdAndOtpEncoded = url.split('/').at(-1);
      const employeeIdAndOtp = atob(employeeIdAndOtpEncoded);
      const [employeeId, otp] = employeeIdAndOtp.split(':');
      const salt = bcrypt.genSaltSync(10);
      const passwordHashed = bcrypt.hashSync(newPassword, salt);
      const isOtpValid = await this.redisService.get(
         `${REDIS_KEY_NEW_EMPLOYEE_OTP}:${employeeId}:${otp}`,
      );
      if (!isOtpValid) throw new BadRequestException('OTP invalid ');
      const isUpdated = await this.employeeRepository.updatePassword(
         parseInt(employeeId),
         passwordHashed,
      );
      return { status: isUpdated };
   }
}
