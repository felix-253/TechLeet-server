import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
   type: 'postgres',
   host: configService.get<string>('DATABASE_HOST', 'localhost'),
   port: configService.get<number>('DATABASE_PORT', 5432),
   username: configService.get<string>('DATABASE_USER', 'postgres'),
   password: configService.get<string>('DATABASE_PASSWORD', 'password'),
   database: configService.get<string>('DATABASE_NAME', 'tech-leet'),
   entities: [__dirname + '/../entities/**/*.entity{.ts,.js}'],
   synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
   logging: configService.get<boolean>('DB_LOGGING', false),
   ssl: configService.get<boolean>('DB_SSL', false),
   retryAttempts: 3,
   retryDelay: 3000,
});
