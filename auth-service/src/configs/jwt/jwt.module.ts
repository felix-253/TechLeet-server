import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({})
export class JwtCoreModule {
   static register(): DynamicModule {
      return {
         module: JwtCoreModule,
         imports: [
            JwtModule.registerAsync({
               imports: [ConfigModule],
               inject: [ConfigService],
               useFactory: async (config: ConfigService): Promise<JwtModuleOptions> => ({
                  secret: config.get<string>('JWT_SECRET'),
                  signOptions: {
                     expiresIn: config.get<string>('JWT_EXPIRATION_TIME'),
                  },
               }),
            }),
         ],
         exports: [JwtModule],
      };
   }
}
