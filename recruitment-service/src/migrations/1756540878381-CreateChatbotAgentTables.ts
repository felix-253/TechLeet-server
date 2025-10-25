import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatbotAgentTables1756540878381 implements MigrationInterface {
  name = 'CreateChatbotAgentTables1756540878381';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Create rag_document table
    await queryRunner.query(`
      CREATE TABLE "rag_document" (
        "document_id" SERIAL PRIMARY KEY,
        "entity_type" VARCHAR NOT NULL,
        "entity_id" INTEGER NOT NULL,
        "content" TEXT NOT NULL,
        "embedding" vector(768),
        "metadata" JSONB,
        "model" VARCHAR(50) NOT NULL DEFAULT 'text-embedding-004',
        "dimensions" INTEGER NOT NULL DEFAULT 768,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for rag_document
    await queryRunner.query(`CREATE INDEX "IDX_rag_document_entity_type" ON "rag_document" ("entity_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_rag_document_entity_id" ON "rag_document" ("entity_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_rag_document_entity_unique" ON "rag_document" ("entity_type", "entity_id")`);
    
    // Create vector index for similarity search
    await queryRunner.query(`CREATE INDEX "IDX_rag_document_embedding_cosine" ON "rag_document" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100)`);

    // Create chat_session table
    await queryRunner.query(`
      CREATE TABLE "chat_session" (
        "session_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" INTEGER NOT NULL,
        "messages" JSONB NOT NULL DEFAULT '[]',
        "context" JSONB NOT NULL DEFAULT '{}',
        "last_active_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
      )
    `);

    // Create indexes for chat_session
    await queryRunner.query(`CREATE INDEX "IDX_chat_session_user_id" ON "chat_session" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_session_last_active_at" ON "chat_session" ("last_active_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_session_expires_at" ON "chat_session" ("expires_at")`);

    // Add trigger to update updated_at timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_rag_document_updated_at 
      BEFORE UPDATE ON rag_document 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Add trigger to update last_active_at and expires_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_session_activity()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.last_active_at = CURRENT_TIMESTAMP;
        NEW.expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours';
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_chat_session_activity 
      BEFORE UPDATE ON chat_session 
      FOR EACH ROW EXECUTE FUNCTION update_session_activity()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_chat_session_activity ON chat_session`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_rag_document_updated_at ON rag_document`);
    
    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_session_activity()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_session"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rag_document"`);
  }
}
