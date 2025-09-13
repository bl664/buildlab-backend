const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateMentorMeetingsTable1640000000015 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "mentor_meetings" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "meeting_id" uuid NOT NULL,
                "mentor_id" uuid NOT NULL
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "mentor_meetings" 
            ADD CONSTRAINT "fk_mentor_meetings_meeting_id" 
            FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "mentor_meetings" 
            ADD CONSTRAINT "fk_mentor_meetings_mentor_id" 
            FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_mentor_meetings_meeting_id" ON "mentor_meetings" ("meeting_id");`);
        await queryRunner.query(`CREATE INDEX "idx_mentor_meetings_mentor_id" ON "mentor_meetings" ("mentor_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_mentor_meetings_unique" ON "mentor_meetings" ("meeting_id", "mentor_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "mentor_meetings";`);
    }
}

module.exports = CreateMentorMeetingsTable1640000000015;
