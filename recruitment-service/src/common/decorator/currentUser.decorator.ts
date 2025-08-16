import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
   const request = ctx.switchToHttp().getRequest();
   const user = request.user;
   const permission = request.permission;
   const isAdmin = request.isAdmin;
   return { user, permission, isAdmin };
});
