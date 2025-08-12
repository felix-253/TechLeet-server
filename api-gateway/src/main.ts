import chalk from 'chalk';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { SwaggerDocument } from './interfaces/microservice.interface';
import { SwaggerAggregatorService } from './services/swagger-aggregator.service';

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

   //  add swaggers document of others service
   const swaggerAggregatorService = app.get(SwaggerAggregatorService);
   // Get the aggregated Swagger document
   const aggregatedDocument: SwaggerDocument =
      await swaggerAggregatorService.getAggregatedSwaggerDocument();

   // Setup Swagger UI
   SwaggerModule.setup('api', app, aggregatedDocument, {
      swaggerOptions: {
         persistAuthorization: true,
         tagsSorter: 'alpha',
         operationsSorter: 'alpha',
         docExpansion: 'none',
      },
      customSiteTitle: 'TechLeet API Gateway - Swagger UI',
   });

   //  routing
   const userServiceProxy = createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathRewrite: (path) => '/api' + path,
      logger: {
         info: (...args) => console.log(chalk.green('[INFO]'), ...args),
         warn: (...args) => console.warn(chalk.yellow('[WARN]'), ...args),
         error: (...args) => console.error(chalk.red('[ERROR]'), ...args),
         debug: (...args) => console.debug(chalk.cyan('[DEBUG]'), ...args),
      },
   });
   server.use('/api/v1/user-service', userServiceProxy);

   await app.listen(port, hostname);

   logger.log(` API Gateway is running on: http://${hostname}:${port}/api`);
}

bootstrap();
