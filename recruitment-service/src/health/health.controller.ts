import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health Check')
export class HealthController {
   @Get()
   @ApiOperation({ summary: 'Health check endpoint' })
   @ApiResponse({ status: 200, description: 'Service is healthy' })
   checkHealth() {
      return {
         status: 'ok',
         service: 'recruitment-service',
         timestamp: new Date().toISOString(),
         uptime: process.uptime(),
      };
   }
}
