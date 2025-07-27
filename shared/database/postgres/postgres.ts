import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
   imports: [
      TypeOrmModule.forRootAsync({
         inject: [ConfigService],
         useFactory: (config: ConfigService) => {
            return {
               type: 'postgres',
               host: config.get<string>('DATABASE_HOST'),
               port: config.get<number>('DATABASE_PORT'),
               username: config.get<string>('DATABASE_USER'),
               password: config.get<string>('DATABASE_PASSWORD'),
               database: config.get<string>('DATABASE_NAME'),
               autoLoadEntities: true,
               synchronize: true,
               dropSchema: false,
               logging: true,
            };
         },
      }),
   ],
})
export class PostgreSQLDatabaseModule {}
