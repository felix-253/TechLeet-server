import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
   catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Internal server error';
      let errorCode = 'INTERNAL_SERVER_ERROR';

      if (exception instanceof HttpException) {
         status = exception.getStatus();
         const responseBody = exception.getResponse();

         if (typeof responseBody === 'string') {
            message = responseBody;
         } else if (typeof responseBody === 'object') {
            const res = responseBody as any;
            message = res.message || message;
            errorCode = res.error || HttpStatus[status];
         }
      }

      response.status(status).json({
         statusCode: status,
         timestamp: new Date().toISOString(),
         path: request.url,
         message,
         errorCode,
      });
   }
}
