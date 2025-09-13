const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateMentorProjectsTable1640000000007 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "mentor_projects" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "mentor_id" uuid,
                "project_id" uuid,
                "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "mentor_projects" 
            ADD CONSTRAINT "fk_mentor_projects_mentor_id" 
            FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "mentor_projects" 
            ADD CONSTRAINT "fk_mentor_projects_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_mentor_projects_mentor_id" ON "mentor_projects" ("mentor_id");`);
        await queryRunner.query(`CREATE INDEX "idx_mentor_projects_project_id" ON "mentor_projects" ("project_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_mentor_projects_unique" ON "mentor_projects" ("mentor_id", "project_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "mentor_projects";`);
    }
}

module.exports = CreateMentorProjectsTable1640000000007;
