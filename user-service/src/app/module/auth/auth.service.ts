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

      const permissions = employee.permissions || [];

      const isAdmin = permissions.find(
         (permission) => permission.permissionType == TYPE_PERMISSION_ENUM.FULL,
      );
      await this.redisService.removeSet(REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId);

      if (isAdmin) {
         await this.redisService.setSet(
            REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId,
            [{ permissionType: TYPE_PERMISSION_ENUM.FULL }],
            60 * 60 * 24,
         );
      } else if (permissions.length > 0) {
         const employeePermissionArr: TYPE_EMPLOYEE_PERMISSION_REDIS[] = permissions.map(
            (permission) => {
               return {
                  departmentId: permission.departmentId,
                  headquarterId: permission.headquarterId,
                  permissionType: permission.permissionType,
               } as TYPE_EMPLOYEE_PERMISSION_REDIS;
            },
         );

         await this.redisService.setSet(
            REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId,
            employeePermissionArr,
         );
      } else {
         // Employee has no permissions - set a default empty permission or handle appropriately
         console.warn(`Employee ${employee.employeeId} has no permissions assigned`);
         // Optionally set a default permission or leave Redis key empty
         await this.redisService.setSet(
            REDIS_KEY_EMPLOYEE_PERMISSION + employee.employeeId,
            [{ permissionType: TYPE_PERMISSION_ENUM.VIEW, departmentId: null, headquarterId: null }],
            60 * 60 * 24,
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
         fullName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
         phoneNumber: employee.phoneNumber || null,
         avatarUrl: employee.avatarUrl || null,
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

   async validateTokenForGateway(token: string) {
      try {
         // Verify JWT token
         const payload = this.jwtService.verify(token);

         if (!payload.employeeId) {
            throw new BadRequestException('Invalid token payload');
         }

         // Get permissions from Redis
         const permissions = await this.redisService.getAllSet(
            REDIS_KEY_EMPLOYEE_PERMISSION + payload.employeeId,
         );

         if (!permissions || permissions.length === 0) {
            throw new BadRequestException('Permission not found');
         }

         // Check if user is admin
         const isAdmin = permissions.some(
            (permission: any) => permission.permissionType === TYPE_PERMISSION_ENUM.FULL,
         );

         return {
            employeeId: payload.employeeId,
            permissions,
            isAdmin,
         };
      } catch (error: any) {
         if (error.name === 'JsonWebTokenError') {
            throw new BadRequestException('Invalid token');
         }
         if (error.name === 'TokenExpiredError') {
            throw new BadRequestException('Token expired');
         }
         throw error;
      }
   }
}
