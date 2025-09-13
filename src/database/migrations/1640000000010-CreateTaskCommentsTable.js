const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateTaskCommentsTable1640000000010 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "task_comments" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "task_id" uuid NOT NULL,
                "author_id" uuid NOT NULL,
                "content" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "parent_comment_id" uuid
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "task_comments" 
            ADD CONSTRAINT "fk_task_comments_task_id" 
            FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "task_comments" 
            ADD CONSTRAINT "fk_task_comments_author_id" 
            FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "task_comments" 
            ADD CONSTRAINT "fk_task_comments_parent_comment_id" 
            FOREIGN KEY ("parent_comment_id") REFERENCES "task_comments" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_task_comments_task_id" ON "task_comments" ("task_id");`);
        await queryRunner.query(`CREATE INDEX "idx_task_comments_author_id" ON "task_comments" ("author_id");`);
        await queryRunner.query(`CREATE INDEX "idx_task_comments_parent_comment_id" ON "task_comments" ("parent_comment_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "task_comments";`);
    }
}

module.exports = CreateTaskCommentsTable1640000000010;