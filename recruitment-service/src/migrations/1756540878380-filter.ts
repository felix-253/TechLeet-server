import { MigrationInterface, QueryRunner } from 'typeorm';

export class FilterScore1756540878380 implements MigrationInterface {
   name = 'FilterScore1756540878380';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
         CREATE TABLE "filter_score" (
            "id" SERIAL PRIMARY KEY,
            "job_posting_id" INT NOT NULL,
            "screening_n" INT DEFAULT 0,
            "screening_mean" DOUBLE PRECISION DEFAULT 0.0,
            "screening_m2" DOUBLE PRECISION DEFAULT 0.0,
            "screening_threshold" DOUBLE PRECISION DEFAULT 0.6,
            "screening_k" DOUBLE PRECISION DEFAULT 0.5,
            "screening_min_threshold" DOUBLE PRECISION DEFAULT 0.0,
            "screening_max_threshold" DOUBLE PRECISION DEFAULT 1.0,
            "created_at" TIMESTAMPTZ DEFAULT now(),
            "updated_at" TIMESTAMPTZ DEFAULT now(),
         );
      `);
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE "filter_score";`);
   }
}
