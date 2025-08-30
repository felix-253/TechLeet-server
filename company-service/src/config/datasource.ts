import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import 'dotenv/config';

config({
   path: resolve(process.cwd(), '.env.development'),
   override: true,
});
config({
   path: resolve(process.cwd(), '.env'),
   override: true,
});
export default new DataSource({
   type: 'postgres',
   host: process.env.DATABASE_HOST,
   port: parseInt(process.env.DATABASE_PORT as string),
   username: process.env.DATABASE_USER,
   password: process.env.DATABASE_PASSWORD,
   database: process.env.DATABASE_NAME,
   entities: [join(process.cwd(), 'src', '**', '*.entity.{ts,js}')],
   migrations: [join(process.cwd(), 'src', 'migrations', '*.{ts,js}')],
   synchronize: false,
   migrationsTableName: 'migrations_company',
   logging: true,
});
