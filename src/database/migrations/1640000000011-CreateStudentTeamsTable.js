const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentTeamsTable1640000000011 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_teams" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "team_id" uuid NOT NULL,
                "student_id" uuid NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_teams" 
            ADD CONSTRAINT "fk_student_teams_team_id" 
            FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "student_teams" 
            ADD CONSTRAINT "fk_student_teams_student_id" 
            FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_teams_team_id" ON "student_teams" ("team_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_teams_student_id" ON "student_teams" ("student_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_teams_unique" ON "student_teams" ("team_id", "student_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_teams";`);
    }
}

module.exports = CreateStudentTeamsTable1640000000011;