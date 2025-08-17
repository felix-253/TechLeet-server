import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export default new DataSource({
   type: 'postgres',
   host: process.env.DATABASE_HOST || 'localhost',
   port: parseInt(process.env.DATABASE_PORT) || 5432,
   username: process.env.DATABASE_USER || 'postgres',
   password: process.env.DATABASE_PASSWORD || 'password',
   database: process.env.DATABASE_NAME || 'tech-leet',
   entities: ['src/entities/**/*.entity.ts'],
   migrations: ['src/migrations/*.ts'],
   synchronize: false,
   logging: true,
});
