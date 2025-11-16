import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUnusedApplicationFields1763278608 implements MigrationInterface {
    name = 'RemoveUnusedApplicationFields1763278608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "priority"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "tags"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "applicationNotes"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "reviewedDate"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "score"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "feedback"`);
        await queryRunner.query(`ALTER TABLE "application" DROP COLUMN IF EXISTS "reviewedBy"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application" ADD "reviewedBy" integer`);
        await queryRunner.query(`ALTER TABLE "application" ADD "feedback" text`);
        await queryRunner.query(`ALTER TABLE "application" ADD "score" integer`);
        await queryRunner.query(`ALTER TABLE "application" ADD "reviewedDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "application" ADD "applicationNotes" text`);
        await queryRunner.query(`ALTER TABLE "application" ADD "tags" text`);
        await queryRunner.query(`ALTER TABLE "application" ADD "priority" character varying(50)`);
    }
}

