import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceConfig } from '../interfaces/microservice.interface';

@Injectable()
export class MicroserviceConfigService {
   private readonly logger = new Logger(MicroserviceConfigService.name);
   private readonly microservices: MicroserviceConfig[];

   constructor(
      private readonly configService: ConfigService,
   ) {
      this.microservices = this.initializeMicroservices();
   }

   private initializeMicroservices(): MicroserviceConfig[] {
      return [
         {
            name: 'user-service',
            url: this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3031',
            swaggerPath: '/api/swagger/json',
            prefix: '/api/v1/user-service',
            healthCheck: '/health',
         },
         {
            name: 'company-service',
            url: this.configService.get<string>('COMPANY_SERVICE_URL') || 'http://localhost:3032',
            swaggerPath: '/api/swagger/json',
            prefix: '/api/v1/company-service',
            healthCheck: '/health',
         },
         {
            name: 'recruitment-service',
            url: this.configService.get<string>('RECRUITMENT_SERVICE_URL') || 'http://localhost:3033',
            swaggerPath: '/api/swagger/json',
            prefix: '/api/v1/recruitment-service',
            healthCheck: '/health',
         },
      ];
   }

   getMicroservices(): MicroserviceConfig[] {
      this.logger.log('Getting microservices configuration');
      return this.microservices;
   }


}
