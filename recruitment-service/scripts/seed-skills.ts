import { DataSource } from 'typeorm';
import { SkillSeedService } from '../src/database/seeds/skill-seed.service';

async function runSeeding() {
   const dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'tech-leet',
      entities: ['src/entities/**/*.entity.ts'],
      synchronize: false,
   });

   try {
      await dataSource.initialize();
      console.log('Database connected successfully');

      await SkillSeedService.seedCommonSkills(dataSource);
      console.log('Skills seeded successfully!');

   } catch (error) {
      console.error('Error during seeding:', error);
   } finally {
      await dataSource.destroy();
   }
}

runSeeding();
