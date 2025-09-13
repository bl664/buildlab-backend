const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateMentorTasksTable1640000000009 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "mentor_tasks" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "task_id" uuid NOT NULL,
                "mentor_id" uuid NOT NULL
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "mentor_tasks" 
            ADD CONSTRAINT "fk_mentor_tasks_task_id" 
            FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "mentor_tasks" 
            ADD CONSTRAINT "fk_mentor_tasks_mentor_id" 
            FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_mentor_tasks_task_id" ON "mentor_tasks" ("task_id");`);
        await queryRunner.query(`CREATE INDEX "idx_mentor_tasks_mentor_id" ON "mentor_tasks" ("mentor_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_mentor_tasks_unique" ON "mentor_tasks" ("task_id", "mentor_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "mentor_tasks";`);
    }
}

module.exports = CreateMentorTasksTable1640000000009;