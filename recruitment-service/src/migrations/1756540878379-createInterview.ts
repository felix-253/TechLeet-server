import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1756540878379 implements MigrationInterface {
   name = 'Init1756540878379';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE TABLE "interviews" (
    "interview_id" SERIAL PRIMARY KEY,
    "candidate_id" INT NOT NULL,
    "job_id" INT NOT NULL,

    "interviewer_ids" INT[] NOT NULL,
    "scores" INT[] CHECK (
        array_length("scores", 1) = array_length("interviewer_ids", 1)
    ),
    "comments" TEXT[] CHECK (
        array_length("comments", 1) = array_length("interviewer_ids", 1)
    ),

    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INT DEFAULT 30,
    "meeting_link" TEXT NOT NULL,
    "location" VARCHAR(255),

    "status" VARCHAR(32) DEFAULT 'scheduled',

    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "UQ_candidate_job_time" UNIQUE ("candidate_id", "job_id", "scheduled_at")
);

    `);
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE "interviews";`);
   }
}
