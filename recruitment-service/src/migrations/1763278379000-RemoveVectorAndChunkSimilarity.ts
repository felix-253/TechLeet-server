import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVectorAndChunkSimilarity1763278379 implements MigrationInterface {
    name = 'RemoveVectorAndChunkSimilarity1763278379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cv_screening_result" DROP COLUMN IF EXISTS "chunkSimilarity"`);
        await queryRunner.query(`ALTER TABLE "cv_screening_result" DROP COLUMN IF EXISTS "vectorSimilarity"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cv_screening_result" ADD "vectorSimilarity" numeric(5,4)`);
        await queryRunner.query(`ALTER TABLE "cv_screening_result" ADD "chunkSimilarity" numeric(5,4)`);
    }
}

