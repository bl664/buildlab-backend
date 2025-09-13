const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateDailyTasksTable1640000000012 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "daily_tasks" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "title" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "status" task_status NOT NULL DEFAULT 'pending'
            );
        `);

        // Add foreign key constraint with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "daily_tasks" 
            ADD CONSTRAINT "fk_daily_tasks_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_daily_tasks_user_id" ON "daily_tasks" ("user_id");`);
        await queryRunner.query(`CREATE INDEX "idx_daily_tasks_status" ON "daily_tasks" ("status");`);
        await queryRunner.query(`CREATE INDEX "idx_daily_tasks_created_at" ON "daily_tasks" ("created_at");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "daily_tasks";`);
    }
}

module.exports = CreateDailyTasksTable1640000000012;
