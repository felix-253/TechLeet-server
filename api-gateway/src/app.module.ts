import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigAppsModule } from './config/config.module';

// Services
import { MicroserviceConfigService } from './services/microservice-config.service';
import { SwaggerAggregatorService } from './services/swagger-aggregator.service';
import { AuthService } from './services/auth.service';

// Middleware
import { LoggerMiddleware } from './middleware/logger.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';

// Controllers
import { SwaggerController } from './controllers/swagger.controller';
import { HealthController } from './controllers/health.controller';

@Module({
   imports: [
      ConfigAppsModule,
      HttpModule.register({
         timeout: 30000,
         maxRedirects: 5,
      }),
   ],
   controllers: [SwaggerController, HealthController],
   providers: [MicroserviceConfigService, SwaggerAggregatorService, AuthService],
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer
         .apply(LoggerMiddleware)
         .forRoutes('*')
         .apply(AuthMiddleware)
         .forRoutes('*');
   }
}
