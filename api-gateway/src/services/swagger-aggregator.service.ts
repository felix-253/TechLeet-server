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

      // Fetch swagger documents from all services
      await Promise.allSettled(
         microservices.map(async (service) => {
            try {
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
               this.logger.error(
                  `Failed to fetch Swagger document from ${service.name}: ${error.message}`,
               );
            }
         }),
      );

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
            {
               url: 'http://localhost:3030',
               description: 'User Service',
            },
         ],
      };

      const microservices = this.microserviceConfigService.getMicroservices();

      Object.entries(swaggerDocs).forEach(([serviceName, doc]) => {
         const service = microservices.find((s) => s.name === serviceName);
         if (!service) return;
         // Merge paths with service prefix
         if (doc.paths) {
            Object.entries(doc.paths).forEach(([path, pathItem]) => {
               const prefixedPath = `${path.split('/api')[1]}`;
               aggregatedDoc.paths[prefixedPath] = pathItem;
            });
         }

         if (doc.components?.schemas) {
            Object.entries(doc.components.schemas).forEach(([schemaName, schema]) => {
               const prefixedSchemaName = `${schemaName}`;
               aggregatedDoc.components.schemas[prefixedSchemaName] = schema;
            });
         }
      });

      return aggregatedDoc;
   }
}
