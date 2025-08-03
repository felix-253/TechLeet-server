import { RedisService } from '@/app/configs/redis';
import {
   CallHandler,
   ExecutionContext,
   Injectable,
   InternalServerErrorException,
   NestInterceptor,
   UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { REDIS_KEY_EMPLOYEE_PERMISSION } from '../constants/redis-key.constant';
import { IAuthInterceptor } from '../types';
import { isEmpty, isNil } from 'lodash';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
   constructor(private readonly redisService: RedisService) {}
   async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const request = ctx.getRequest();
      const user = request.user;
      if (!user || !user?.employeeId) {
         throw new UnauthorizedException('Unauthorized exception');
      }
      const permissions = await this.redisService.getAllSet(
         REDIS_KEY_EMPLOYEE_PERMISSION + user.employeeId,
      );
      if (isEmpty(permissions)) throw new UnauthorizedException('Permission exception');
      request.user = {
         employeeId: user.employeeId,
         permissions,
      } as IAuthInterceptor;
      return next.handle();
   }
}
