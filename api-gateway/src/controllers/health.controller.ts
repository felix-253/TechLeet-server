import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MicroserviceConfigService } from '../services/microservice-config.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('health')
@ApiTags('Health Check')
export class HealthController {
   private readonly logger = new Logger(HealthController.name);

   constructor(
      private readonly microserviceConfigService: MicroserviceConfigService,
      private readonly httpService: HttpService,
   ) {}

   @Get()
   @ApiOperation({ summary: 'API Gateway health check' })
   @ApiResponse({ status: 200, description: 'API Gateway is healthy' })
   checkHealth() {
      return {
         status: 'ok',
         service: 'api-gateway',
         timestamp: new Date().toISOString(),
         uptime: process.uptime(),
      };
   }

   @Get('services')
   @ApiOperation({ 
      summary: 'Check health of all microservices',
      description: 'Checks the health status of all registered microservices'
   })
   @ApiResponse({ 
      status: 200, 
      description: 'Health status of all microservices',
   })
   async checkServicesHealth() {
      const microservices = this.microserviceConfigService.getMicroservices();
      const healthChecks = await Promise.allSettled(
         microservices.map(async (service) => {
            try {
               const response = await firstValueFrom(
                  this.httpService.get(`${service.url}${service.healthCheck}`, {
                     timeout: 5000,
                  }),
               );
               
               return {
                  service: service.name,
                  status: 'healthy',
                  url: service.url,
                  response: response.data,
                  responseTime: Date.now()
               };
            } catch (error) {
               return {
                  service: service.name,
                  status: 'unhealthy',
                  url: service.url,
                  error: error.message,
                  responseTime: Date.now()
               };
            }
         })
      );

      const results = healthChecks.map((result) => 
         result.status === 'fulfilled' ? result.value : result.reason
      );

      const healthyCount = results.filter(r => r.status === 'healthy').length;
      const totalCount = results.length;

      return {
         gateway: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
         },
         services: results,
         summary: {
            total: totalCount,
            healthy: healthyCount,
            unhealthy: totalCount - healthyCount,
            overallStatus: healthyCount === totalCount ? 'all_healthy' : 'some_unhealthy'
         }
      };
   }
}
