import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
   private readonly logger = new Logger(CurrentUserInterceptor.name);

   async intercept(context: ExecutionContext, next: CallHandler) {
      try {
         const request = context.switchToHttp().getRequest();
         
         // If req.user doesn't exist, reconstruct it from headers sent by API Gateway
         if (!request.user) {
            const userId = request.headers['x-user-id'];
            const permissions = request.headers['x-user-permissions'];
            const isAdmin = request.headers['x-user-is-admin'];
            
            this.logger.debug(`Reconstructing req.user from headers: userId=${userId}, permissions=${permissions}, isAdmin=${isAdmin}`);
            
            if (userId) {
               try {
                  request.user = {
                     employeeId: parseInt(userId as string, 10),
                     permissions: permissions ? JSON.parse(permissions as string) : [],
                     isAdmin: isAdmin === 'true',
                  };
                  this.logger.debug(`Successfully reconstructed req.user: ${JSON.stringify(request.user)}`);
               } catch (parseError) {
                  this.logger.error(`Failed to parse user headers: ${parseError.message}`, parseError.stack);
               }
            } else {
               this.logger.warn('No x-user-id header found, req.user will remain undefined');
            }
         }
         
         // API Gateway sets req.user.employeeId, so use that instead of req.user.id
         request.userId = request.user?.employeeId || request.user?.id;
         request.permission = request.headers['x-user-permissions'];
         request.isAdmin = request.user?.isAdmin;
         
         return next.handle();
      } catch (error) {
         this.logger.error(`CurrentUserInterceptor error: ${error.message}`, error.stack);
         throw error;
      }
   }
}
