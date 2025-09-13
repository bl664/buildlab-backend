const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateMeetingsTable1640000000013 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "meetings" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "project_id" uuid,
                "created_by_id" uuid NOT NULL,
                "room_name" text NOT NULL,
                "started_at" timestamp,
                "ended_at" timestamp,
                "room_link" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "meetings" 
            ADD CONSTRAINT "fk_meetings_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "meetings" 
            ADD CONSTRAINT "fk_meetings_created_by_id" 
            FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_meetings_project_id" ON "meetings" ("project_id");`);
        await queryRunner.query(`CREATE INDEX "idx_meetings_created_by_id" ON "meetings" ("created_by_id");`);
        await queryRunner.query(`CREATE INDEX "idx_meetings_started_at" ON "meetings" ("started_at");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "meetings";`);
    }
}

module.exports = CreateMeetingsTable1640000000013;
