import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IAuthInterceptor } from '../types';
import { TYPE_PERMISSION_ENUM } from '@/entities/master/enum/permission.enum';
import _ from 'lodash';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
   const request = ctx.switchToHttp().getRequest();
   const user = request.user as IAuthInterceptor;
   let isAdmin = false;
   _.map(user.permissions, (permission) => {
      permission.permissionType === TYPE_PERMISSION_ENUM.FULL ? (isAdmin = true) : '';
   });
   return {
      ...user,
      isAdmin,
   };
});
