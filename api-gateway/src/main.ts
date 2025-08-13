import chalk from 'chalk';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { MicroserviceConfigService } from './services/microservice-config.service';

async function bootstrap() {
   const app = await NestFactory.create(AppModule);
   const configService = app.get(ConfigService);
   const logger = new Logger('Bootstrap');
   const server = app.getHttpAdapter().getInstance();
   const port = configService.get<number>('PORT', 3030);
   const hostname = configService.get<string>('HOST', 'localhost');

   // Security
   app.use(
      helmet({
         contentSecurityPolicy: false,
      }),
   );

   // CORS
   app.enableCors({
      origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:3030'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
         'Content-Type',
         'Authorization',
         'x-user-id',
         'x-user-permissions',
         'x-user-is-admin',
      ],
   });

   // Global validation pipe
   app.useGlobalPipes(
      new ValidationPipe({
         transform: true,
         whitelist: true,
         forbidNonWhitelisted: true,
      }),
   );

   // Setup Swagger UI with service selector
   const microserviceConfigService = app.get(MicroserviceConfigService);
   const microservices = microserviceConfigService.getMicroservices();

   // Prepare specs for the selector
   const specs: Array<{ name: string; url: string }> = [
      {
         name: 'All Services',
         url: '/swagger/json/all-services',
      },
   ];

   // Add individual service specs
   for (const service of microservices) {
      const serviceName = service.name.replace('-service', '').replace('-', ' ');
      const displayName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1) + ' Service';

      specs.push({
         name: displayName,
         url: `/swagger/json/${service.name}`,
      });
   }

   logger.log(`📋 Prepared ${specs.length} specs for selector:`);
   specs.forEach(spec => logger.log(`   - ${spec.name}: ${spec.url}`));

   // Setup single Swagger UI with spec selector
   SwaggerModule.setup('api', app, null as any, {
      swaggerOptions: {
         urls: specs,
         'urls.primaryName': 'All Services',
         persistAuthorization: true,
         tagsSorter: 'alpha',
         operationsSorter: 'alpha',
         docExpansion: 'none',
      },
      customSiteTitle: 'TechLeet API Gateway - Swagger UI',
      explorer: true,
   });

   logger.log(`✅ Set up Swagger UI with ${specs.length} service specs at /api`);
   logger.log(`🔍 Swagger options configured with urls:`, JSON.stringify(specs, null, 2));

   //  routing for all microservices
   const createServiceProxy = (target: string, serviceName: string) => {
      const proxy = createProxyMiddleware({
         target,
         changeOrigin: true,
         pathRewrite: (path: string) => {
            const rewritten = `/api${path}`;
            console.log(`[${serviceName.toUpperCase()}] Path rewrite: ${path} -> ${rewritten}`);
            return rewritten;
         },
         logger: {
            info: (...args: any[]) => console.log(chalk.green(`[${serviceName.toUpperCase()}]`), ...args),
            warn: (...args: any[]) => console.warn(chalk.yellow(`[${serviceName.toUpperCase()}]`), ...args),
            error: (...args: any[]) => console.error(chalk.red(`[${serviceName.toUpperCase()}]`), ...args),
            debug: (...args: any[]) => console.debug(chalk.cyan(`[${serviceName.toUpperCase()}]`), ...args),
         },
         on: {
            error: (err: Error, _req: Request, res: Response) => {
               logger.error(`Proxy error for ${serviceName}:`, err.message);
               if (!res.headersSent) {
                  res.status(503).json({
                     error: 'Service Unavailable',
                     message: `${serviceName} is currently unavailable`,
                     timestamp: new Date().toISOString(),
                  });
               }
            },
         },
      });
      return proxy;
   };

   // User Service Proxy
   const userServiceProxy = createServiceProxy(
      configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3031',
      'user-service'
   );
   server.use('/api/v1/user-service', userServiceProxy);

   // Company Service Proxy
   const companyServiceProxy = createServiceProxy(
      configService.get<string>('COMPANY_SERVICE_URL') || 'http://localhost:3032',
      'company-service'
   );
   server.use('/api/v1/company-service', companyServiceProxy);

   // Recruitment Service Proxy
   const recruitmentServiceProxy = createServiceProxy(
      configService.get<string>('RECRUITMENT_SERVICE_URL') || 'http://localhost:3033',
      'recruitment-service'
   );
   server.use('/api/v1/recruitment-service', recruitmentServiceProxy);

   await app.listen(port, hostname);

   logger.log(` API Gateway is running on: http://${hostname}:${port}/api`);
}

bootstrap();
