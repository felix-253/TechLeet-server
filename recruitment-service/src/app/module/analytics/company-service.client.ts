import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class CompanyServiceClient {
   private readonly logger = new Logger(CompanyServiceClient.name);
   private readonly httpClient: AxiosInstance;
   private readonly baseUrl: string;

   constructor(private readonly configService: ConfigService) {
      const apiGatewayUrl = this.configService.get<string>('API_GATEWAY_URL', 'http://localhost:3030');
      const companyServiceUrl = this.configService.get<string>('COMPANY_SERVICE_URL', 'http://localhost:3032');
      
      this.baseUrl = apiGatewayUrl ? `${apiGatewayUrl}/api/v1/company-service` : companyServiceUrl;
      
      this.httpClient = axios.create({
         baseURL: this.baseUrl,
         timeout: 5000,
         headers: {
            'Content-Type': 'application/json',
         },
      });

      this.logger.log(`Company Service Client initialized with base URL: ${this.baseUrl}`);
   }

   async getTotalEmployees(): Promise<number> {
      try {
         const response = await this.httpClient.get('/employees', {
            params: {
               limit: 1,
            },
         });

         if (response.data && typeof response.data.total === 'number') {
            return response.data.total;
         }

         if (Array.isArray(response.data)) {
            return response.data.length;
         }

         return 0;
      } catch (error) {
         this.logger.warn(`Failed to fetch total employees from company-service: ${error.message}`);
         return 0;
      }
   }

   async getEmployeesByDepartment(departmentId?: number): Promise<number> {
      try {
         const params: any = { limit: 1 };
         if (departmentId) {
            params.departmentId = departmentId;
         }

         const response = await this.httpClient.get('/employees', { params });

         if (response.data && typeof response.data.total === 'number') {
            return response.data.total;
         }

         if (Array.isArray(response.data)) {
            return response.data.length;
         }

         return 0;
      } catch (error) {
         this.logger.warn(`Failed to fetch employees by department from company-service: ${error.message}`);
         return 0;
      }
   }
}

