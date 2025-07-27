import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class AdminPermissionInterceptor implements NestInterceptor {
   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const ctx = context.switchToHttp();
      const request = ctx.getRequest<Request>();
      const httpMethod = request.method;

      return next.handle().pipe(
         map((data) => ({
            statusCode: ctx.getResponse().statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            data,
         })),
      );
   }
}
