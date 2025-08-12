import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { MicroserviceConfigService } from './microservice-config.service';

@Injectable()
export class ProxyService {
   // private readonly logger = new Logger(ProxyService.name);
   // constructor(
   //    private readonly httpService: HttpService,
   //    private readonly microserviceConfigService: MicroserviceConfigService,
   // ) {}
   // async proxyRequest(
   //    method: string,
   //    originalUrl: string,
   //    body: any,
   //    headers: Record<string, string>,
   //    query: Record<string, any>,
   // ): Promise<AxiosResponse> {
   //    const service = this.microserviceConfigService.getMicroserviceByPrefix(originalUrl);
   //    if (!service) {
   //       throw new Error(`No microservice found for path: ${originalUrl}`);
   //    }
   //    // Check service health before proxying
   //    const isHealthy = await this.microserviceConfigService.checkServiceHealth(service);
   //    if (!isHealthy) {
   //       throw new Error(`Service ${service.name} is currently unavailable`);
   //    }
   //    // Remove the service prefix from the URL
   //    const targetPath = originalUrl.replace(service.prefix, '');
   //    const targetUrl = `${service.url}${targetPath}`;
   //    // Prepare headers (exclude host header to avoid conflicts)
   //    const proxyHeaders = { ...headers };
   //    delete proxyHeaders.host;
   //    delete proxyHeaders['content-length'];
   //    // Prepare request config
   //    const config: AxiosRequestConfig = {
   //       method: method.toLowerCase() as any,
   //       url: targetUrl,
   //       headers: proxyHeaders,
   //       timeout: 30000, // 30 seconds timeout
   //    };
   //    // Add query parameters
   //    if (query && Object.keys(query).length > 0) {
   //       config.params = query;
   //    }
   //    // Add body for POST, PUT, PATCH requests
   //    if (['post', 'put', 'patch'].includes(method.toLowerCase()) && body) {
   //       config.data = body;
   //    }
   //    try {
   //       this.logger.log(`Proxying ${method} ${originalUrl} -> ${targetUrl}`);
   //       const response = await firstValueFrom(this.httpService.request(config));
   //       this.logger.log(`Proxy response: ${response.status} from ${service.name}`);
   //       return response;
   //    } catch (error) {
   //       this.logger.error(`Proxy error for ${service.name}: ${error.message}`);
   //       // Re-throw the error with original response if available
   //       if (error.response) {
   //          throw error;
   //       }
   //       // If no response, it's likely a network/timeout error
   //       throw new Error(`Service ${service.name} is currently unavailable`);
   //    }
   // }
}
