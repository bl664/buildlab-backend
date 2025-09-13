const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentProjectsTable1640000000006 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_projects" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "project_id" uuid,
                "student_id" uuid,
                "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_projects" 
            ADD CONSTRAINT "fk_student_projects_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "student_projects" 
            ADD CONSTRAINT "fk_student_projects_student_id" 
            FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_projects_project_id" ON "student_projects" ("project_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_projects_student_id" ON "student_projects" ("student_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_projects_unique" ON "student_projects" ("project_id", "student_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_projects";`);
    }
}

module.exports = CreateStudentProjectsTable1640000000006;
