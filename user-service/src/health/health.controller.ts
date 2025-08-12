import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
@ApiTags('Health')
export class HealthController {
   @Get('/health')
   @ApiOperation({
      summary: 'Health check endpoint',
      description: 'Returns the health status of the user service',
   })
   @ApiResponse({
      status: 200,
      description: 'Service is healthy',
      schema: {
         type: 'object',
         properties: {
            status: {
               type: 'string',
               example: 'ok',
            },
            timestamp: {
               type: 'string',
               example: '2025-08-09T10:30:00.000Z',
            },
            service: {
               type: 'string',
               example: 'user-service',
            },
         },
      },
   })
   getHealth() {
      return {
         status: 'ok',
         timestamp: new Date().toISOString(),
         service: 'user-service',
      };
   }
}
