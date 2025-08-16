import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
   async intercept(context: ExecutionContext, next: CallHandler) {
      try {
         const request = context.switchToHttp().getRequest();
         request.userId = request.user.id;
         request.permission = request.headers['x-user-permissions'];
         request.isAdmin = request.user.isAdmin;
         return next.handle();
      } catch (error) {
         throw error;
      }
   }
}
