import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@/app/configs/redis';
import { REDIS_KEY_EMPLOYEE_PERMISSION } from '@/common/constants/redis-key.constant';
import { isEmpty } from 'lodash';

@Injectable()
export class TokenValidationService {
   constructor(
      private readonly jwtService: JwtService,
      private readonly redisService: RedisService,
   ) {}

   async validateToken(token: string) {
      try {
         // Verify JWT token
         const payload = this.jwtService.verify(token);

         if (!payload.employeeId) {
            throw new UnauthorizedException('Invalid token payload');
         }

         // Get permissions from Redis
         const permissions = await this.redisService.getAllSet(
            REDIS_KEY_EMPLOYEE_PERMISSION + payload.employeeId,
         );

         if (isEmpty(permissions)) {
            throw new UnauthorizedException('Permission not found');
         }

         // Check if user is admin
         const isAdmin = permissions.some(
            (permission: any) => permission.permissionType === 'FULL',
         );

         return {
            employeeId: payload.employeeId,
            permissions,
            isAdmin,
         };
      } catch (error) {
         //   if (error.name === 'JsonWebTokenError') {
         //     throw new UnauthorizedException('Invalid token');
         //   }
         //   if (error.name === 'TokenExpiredError') {
         //     throw new UnauthorizedException('Token expired');
         //   }
         console.log('error', error);
         throw error;
      }
   }
}
