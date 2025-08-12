import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MicroserviceConfig } from '../interfaces/microservice.interface';

@Injectable()
export class MicroserviceConfigService {
   private readonly logger = new Logger(MicroserviceConfigService.name);
   private readonly microservices: MicroserviceConfig[];

   constructor(
      private readonly configService: ConfigService,
      private readonly httpService: HttpService,
   ) {
      this.microservices = this.initializeMicroservices();
   }

   private initializeMicroservices(): MicroserviceConfig[] {
      return [
         {
            name: 'user-service',
            url: this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3000',
            swaggerPath: '/swagger/json',
            prefix: 'user-service',
            healthCheck: '/health',
         },
      ];
   }

   getMicroservices(): MicroserviceConfig[] {
      this.logger.log('Getting microservices configuration');
      return this.microservices;
   }
}
