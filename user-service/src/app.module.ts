import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreModule } from './app/module/core-module.module';
import { LoggerMiddleware } from './common/middleware';
import { ConfigAppsModule } from './app/configs/configs.module';

@Module({
   //
   imports: [ConfigAppsModule, CoreModule],
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
   }
}
