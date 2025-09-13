const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateTasksTable1640000000004 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "tasks" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "title" varchar(255) NOT NULL,
                "description" text,
                "status" tasks_status_enum NOT NULL DEFAULT 'pending',
                "project_id" uuid,
                "due_date" date NOT NULL,
                "priority" tasks_priority_enum NOT NULL DEFAULT 'low',
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                "created_by" uuid
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "tasks" 
            ADD CONSTRAINT "fk_tasks_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "tasks" 
            ADD CONSTRAINT "fk_tasks_created_by" 
            FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_tasks_project_id" ON "tasks" ("project_id");`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_created_by" ON "tasks" ("created_by");`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_status" ON "tasks" ("status");`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_due_date" ON "tasks" ("due_date");`);
        await queryRunner.query(`CREATE INDEX "idx_tasks_priority" ON "tasks" ("priority");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "tasks";`);
    }
}

module.exports = CreateTasksTable1640000000004;