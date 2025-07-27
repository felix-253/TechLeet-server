import { Module } from '@nestjs/common';
import { PostgreSQLDatabaseModule } from './postgres/postgres';

@Module({
   imports: [PostgreSQLDatabaseModule],
})
export class DatabaseModule {}
