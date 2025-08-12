import { Controller, All, Req, Res, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from '../services/proxy.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
@ApiTags('Gateway')
export class ProxyController {
   private readonly logger = new Logger(ProxyController.name);

   constructor(private readonly proxyService: ProxyService) {}

   @All('/api/*')
   @ApiOperation({
      summary: 'Proxy all API requests to microservices',
      description:
         'This endpoint proxies all requests with /api/* pattern to the appropriate microservices',
   })
   @ApiResponse({
      status: 200,
      description: 'Request successfully proxied to microservice',
   })
   @ApiResponse({
      status: 404,
      description: 'No microservice found for the requested path',
   })
   @ApiResponse({
      status: 503,
      description: 'Target microservice is currently unavailable',
   })
   async proxyToMicroservice(@Req() req: Request, @Res() res: Response): Promise<void> {
      // try {
      //    const { method, originalUrl, body, headers, query } = req;
      //    // Convert headers to a plain object
      //    const headersObj: Record<string, string> = {};
      //    Object.entries(headers).forEach(([key, value]) => {
      //       if (typeof value === 'string') {
      //          headersObj[key] = value;
      //       } else if (Array.isArray(value)) {
      //          headersObj[key] = value.join(', ');
      //       }
      //    });
      //    const response = await this.proxyService.proxyRequest(
      //       method,
      //       originalUrl,
      //       body,
      //       headersObj,
      //       query as Record<string, any>,
      //    );
      //    // Set response headers from the proxied response
      //    Object.entries(response.headers).forEach(([key, value]) => {
      //       if (
      //          key.toLowerCase() !== 'transfer-encoding' &&
      //          key.toLowerCase() !== 'content-encoding'
      //       ) {
      //          res.setHeader(key, value as string);
      //       }
      //    });
      //    // Set status code and send response
      //    res.status(response.status).send(response.data);
      // } catch (error) {
      //    this.logger.error(`Proxy error: ${error.message}`);
      //    if (error.response) {
      //       // Forward the error response from the microservice
      //       const { status, data, headers } = error.response;
      //       // Set headers from error response
      //       Object.entries(headers).forEach(([key, value]) => {
      //          if (
      //             key.toLowerCase() !== 'transfer-encoding' &&
      //             key.toLowerCase() !== 'content-encoding'
      //          ) {
      //             res.setHeader(key, value as string);
      //          }
      //       });
      //       res.status(status).send(data);
      //    } else if (error.message.includes('No microservice found')) {
      //       throw new HttpException(
      //          {
      //             statusCode: HttpStatus.NOT_FOUND,
      //             message: error.message,
      //             error: 'Not Found',
      //          },
      //          HttpStatus.NOT_FOUND,
      //       );
      //    } else if (error.message.includes('unavailable')) {
      //       throw new HttpException(
      //          {
      //             statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      //             message: error.message,
      //             error: 'Service Unavailable',
      //          },
      //          HttpStatus.SERVICE_UNAVAILABLE,
      //       );
      //    } else {
      //       throw new HttpException(
      //          {
      //             statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      //             message: 'Internal server error during request proxying',
      //             error: 'Internal Server Error',
      //          },
      //          HttpStatus.INTERNAL_SERVER_ERROR,
      //       );
      //    }
      // }
   }
}
