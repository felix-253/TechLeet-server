import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreModule } from './app/module/core-module.module';
import { LoggerMiddleware } from './common/middleware';
import { ConfigAppsModule } from './app/configs/configs.module';
import { HealthController } from './health/health.controller';

@Module({
   //
   imports: [ConfigAppsModule, CoreModule],
   controllers: [HealthController],
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
   }
}
