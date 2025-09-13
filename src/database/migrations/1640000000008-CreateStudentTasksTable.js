const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentTasksTable1640000000008 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_tasks" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "task_id" uuid NOT NULL,
                "student_id" uuid NOT NULL
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_tasks" 
            ADD CONSTRAINT "fk_student_tasks_task_id" 
            FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "student_tasks" 
            ADD CONSTRAINT "fk_student_tasks_student_id" 
            FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_tasks_task_id" ON "student_tasks" ("task_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_tasks_student_id" ON "student_tasks" ("student_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_tasks_unique" ON "student_tasks" ("task_id", "student_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_tasks";`);
    }
}

module.exports = CreateStudentTasksTable1640000000008;
