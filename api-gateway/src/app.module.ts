import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigAppsModule } from './config/config.module';

// Services
import { MicroserviceConfigService } from './services/microservice-config.service';
import { SwaggerAggregatorService } from './services/swagger-aggregator.service';

// Middleware
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
   imports: [
      ConfigAppsModule,
      HttpModule.register({
         timeout: 30000,
         maxRedirects: 5,
      }),
   ],
   controllers: [],
   providers: [MicroserviceConfigService, SwaggerAggregatorService],
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
   }
}
