const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateTeamsTable1640000000005 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "teams" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "project_association" uuid,
                "mentor_id" uuid,
                "description" text,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "teams" 
            ADD CONSTRAINT "fk_teams_project_association" 
            FOREIGN KEY ("project_association") REFERENCES "projects" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "teams" 
            ADD CONSTRAINT "fk_teams_mentor_id" 
            FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_teams_project_association" ON "teams" ("project_association");`);
        await queryRunner.query(`CREATE INDEX "idx_teams_mentor_id" ON "teams" ("mentor_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "teams";`);
    }
}

module.exports = CreateTeamsTable1640000000005;