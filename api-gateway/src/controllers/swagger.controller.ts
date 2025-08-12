import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SwaggerAggregatorService } from '../services/swagger-aggregator.service';
import { MicroserviceConfigService } from '../services/microservice-config.service';

@Controller()
export class SwaggerController {
   private readonly logger = new Logger(SwaggerController.name);

   constructor(
      private readonly swaggerAggregatorService: SwaggerAggregatorService,
      private readonly microserviceConfigService: MicroserviceConfigService,
   ) {}

   @Get('swagger/json/all-services')
   async getAllServicesJson(@Res() res: Response) {
      try {
         const aggregatedDoc = await this.swaggerAggregatorService.getAggregatedSwaggerDocument();
         res.json(aggregatedDoc);
      } catch (error) {
         this.logger.error('Failed to get aggregated Swagger document', error);
         res.status(500).json({ error: 'Failed to fetch aggregated documentation' });
      }
   }

   @Get('swagger/json/:serviceName')
   async getServiceJson(@Param('serviceName') serviceName: string, @Res() res: Response) {
      try {
         const serviceDoc = await this.swaggerAggregatorService.getServiceSpecificDocument(serviceName);

         if (!serviceDoc) {
            return res.status(404).json({
               error: 'Service documentation not found',
               service: serviceName,
            });
         }

         res.json(serviceDoc);
      } catch (error) {
         this.logger.error(`Failed to get Swagger for service ${serviceName}`, error);
         res.status(500).json({
            error: 'Failed to fetch service documentation',
            service: serviceName,
         });
      }
   }

   @Get('swagger/refresh')
   async refreshSwagger() {
      this.logger.log('Manual Swagger refresh requested');
      
      try {
         const aggregatedDoc = await this.swaggerAggregatorService.getAggregatedSwaggerDocument();
         
         // Count the number of paths to determine how many services were aggregated
         const pathCount = Object.keys(aggregatedDoc.paths || {}).length;
         const serviceNames = Object.keys(aggregatedDoc.paths || {})
            .map(path => path.split('/')[3]) // Extract service name from /api/v1/service-name/...
            .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
         
         return {
            message: 'Swagger documentation refreshed successfully',
            services: serviceNames,
            pathCount,
            timestamp: new Date().toISOString()
         };
      } catch (error) {
         this.logger.error('Failed to refresh Swagger documentation', error);
         throw error;
      }
   }

   @Get('swagger/status')
   async getSwaggerStatus() {
      try {
         const aggregatedDoc = await this.swaggerAggregatorService.getAggregatedSwaggerDocument();
         
         const pathCount = Object.keys(aggregatedDoc.paths || {}).length;
         const serviceNames = Object.keys(aggregatedDoc.paths || {})
            .map(path => path.split('/')[3])
            .filter((name, index, arr) => arr.indexOf(name) === index);
         
         return {
            status: 'active',
            totalPaths: pathCount,
            aggregatedServices: serviceNames,
            lastUpdated: new Date().toISOString()
         };
      } catch (error) {
         this.logger.error('Failed to get Swagger status', error);
         return {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
         };
      }
   }

   @Get('swagger/services')
   getAvailableServices() {
      const microservices = this.microserviceConfigService.getMicroservices();

      return {
         services: microservices.map(service => ({
            name: service.name,
            displayName: service.name.replace('-service', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            url: service.url,
            swaggerUrl: `${service.url}${service.swaggerPath}`,
            healthUrl: `${service.url}${service.healthCheck}`,
            gatewaySwaggerUrl: `/swagger/service/${service.name}`,
         })),
         total: microservices.length,
         timestamp: new Date().toISOString()
      };
   }


}
