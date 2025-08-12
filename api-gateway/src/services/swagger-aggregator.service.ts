import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SwaggerDocument } from '../interfaces/microservice.interface';
import { MicroserviceConfigService } from './microservice-config.service';

@Injectable()
export class SwaggerAggregatorService {
   private readonly logger = new Logger(SwaggerAggregatorService.name);

   constructor(
      private readonly httpService: HttpService,
      private readonly microserviceConfigService: MicroserviceConfigService,
   ) {}

   async getAggregatedSwaggerDocument(): Promise<SwaggerDocument> {
      // Generate new aggregated document
      const aggregatedDoc = await this.generateAggregatedSwaggerDocument();

      return aggregatedDoc;
   }

   private async generateAggregatedSwaggerDocument(): Promise<SwaggerDocument> {
      const microservices = this.microserviceConfigService.getMicroservices();
      const swaggerDocs: { [serviceName: string]: SwaggerDocument } = {};

      this.logger.log(`Starting Swagger aggregation for ${microservices.length} services`);

      // Fetch swagger documents from all services
      await Promise.allSettled(
         microservices.map(async (service) => {
            try {
               this.logger.log(`Fetching Swagger from ${service.name} at ${service.url}${service.swaggerPath}`);

               const response = await firstValueFrom(
                  this.httpService.get(`${service.url}${service.swaggerPath}`, {
                     timeout: 10000,
                  }),
               );

               if (response.data) {
                  swaggerDocs[service.name] = response.data;
                  this.logger.log(`Successfully fetched Swagger document from ${service.name}`);
               }
            } catch (error) {
               this.logger.warn(
                  `Failed to fetch Swagger document from ${service.name}: ${error.message || 'Service not available'}`,
               );
               // Continue without this service's documentation
            }
         }),
      );

      this.logger.log(`Successfully fetched Swagger docs from ${Object.keys(swaggerDocs).length} services: ${Object.keys(swaggerDocs).join(', ')}`);

      if (Object.keys(swaggerDocs).length === 0) {
         this.logger.warn('No Swagger documents were fetched from any service');
      }

      return this.mergeSwaggerDocuments(swaggerDocs);
   }

   private mergeSwaggerDocuments(swaggerDocs: {
      [serviceName: string]: SwaggerDocument;
   }): SwaggerDocument {
      const aggregatedDoc: SwaggerDocument = {
         openapi: '3.0.0',
         info: {
            title: 'TechLeet API Gateway',
            description: 'Aggregated API documentation for all microservices',
            version: '1.0.0',
         },
         paths: {},
         components: {
            schemas: {},
            securitySchemes: {
               BearerAuth: {
                  type: 'http',
                  scheme: 'bearer',
                  bearerFormat: 'JWT',
               },
            },
         },
         servers: [
            {
               url: 'http://localhost:3030',
               description: 'API Gateway',
            },
         ],
      };

      const microservices = this.microserviceConfigService.getMicroservices();

      Object.entries(swaggerDocs).forEach(([serviceName, doc]) => {
         const service = microservices.find((s) => s.name === serviceName);
         if (!service) return;

         this.logger.log(`Merging Swagger document from ${serviceName}`);

         // Merge paths with service prefix
         if (doc.paths) {
            Object.entries(doc.paths).forEach(([path, pathItem]) => {
               // Remove /api prefix from service path and add gateway prefix
               const cleanPath = path.replace('/api', '');
               const prefixedPath = `/api/v1/${serviceName}${cleanPath}`;

               // Add service tag to all operations
               if (pathItem && typeof pathItem === 'object') {
                  Object.values(pathItem).forEach((operation: any) => {
                     if (operation && typeof operation === 'object' && operation.tags) {
                        operation.tags = operation.tags.map((tag: string) => `${serviceName}: ${tag}`);
                     } else if (operation && typeof operation === 'object') {
                        operation.tags = [serviceName];
                     }
                  });
               }

               aggregatedDoc.paths[prefixedPath] = pathItem;
               this.logger.log(`Added path: ${prefixedPath}`);
            });
         }

         // Merge components with service prefix to avoid conflicts
         if (doc.components?.schemas) {
            Object.entries(doc.components.schemas).forEach(([schemaName, schema]) => {
               const prefixedSchemaName = `${serviceName}_${schemaName}`;
               aggregatedDoc.components.schemas[prefixedSchemaName] = schema;
            });
         }

         // Merge security schemes
         if (doc.components?.securitySchemes) {
            Object.entries(doc.components.securitySchemes).forEach(([schemeName, scheme]) => {
               aggregatedDoc.components.securitySchemes[schemeName] = scheme;
            });
         }
      });

      return aggregatedDoc;
   }

   async getServiceSpecificDocument(serviceName: string): Promise<SwaggerDocument | null> {
      const microservices = this.microserviceConfigService.getMicroservices();
      const service = microservices.find(s => s.name === serviceName);

      if (!service) {
         this.logger.warn(`Service ${serviceName} not found in configuration`);
         return null;
      }

      try {
         this.logger.log(`Fetching service-specific Swagger from ${service.name} at ${service.url}${service.swaggerPath}`);

         const response = await firstValueFrom(
            this.httpService.get(`${service.url}${service.swaggerPath}`, {
               timeout: 10000,
            }),
         );

         if (!response.data) {
            this.logger.warn(`No Swagger data received from ${serviceName}`);
            return null;
         }

         // Modify the document to work with API Gateway paths
         const serviceDoc = { ...response.data };

         // Update server to point to API Gateway with service prefix
         serviceDoc.servers = [
            {
               url: 'http://localhost:3030',
               description: `API Gateway - ${serviceName}`,
            },
         ];

         // Update paths to include API Gateway prefix
         if (serviceDoc.paths) {
            const updatedPaths: any = {};
            Object.entries(serviceDoc.paths).forEach(([path, pathItem]) => {
               const cleanPath = path.replace('/api', '');
               const gatewayPath = `/api/v1/${serviceName}${cleanPath}`;
               updatedPaths[gatewayPath] = pathItem;
            });
            serviceDoc.paths = updatedPaths;
         }

         // Update title to indicate it's service-specific
         if (serviceDoc.info) {
            const originalTitle = serviceDoc.info.title || serviceName;
            serviceDoc.info.title = `${originalTitle} (via API Gateway)`;
            serviceDoc.info.description = `${serviceDoc.info.description || ''}\n\nThis documentation shows ${serviceName} endpoints accessible through the API Gateway.`;
         }

         this.logger.log(`Successfully prepared service-specific Swagger for ${serviceName}`);
         return serviceDoc;

      } catch (error) {
         this.logger.warn(`Failed to fetch service-specific Swagger from ${serviceName}: ${error.message}`);
         return null;
      }
   }
}
