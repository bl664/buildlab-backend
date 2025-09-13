const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentMeetingsTable1640000000014 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_meetings" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "meeting_id" uuid NOT NULL,
                "student_id" uuid NOT NULL
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_meetings" 
            ADD CONSTRAINT "fk_student_meetings_meeting_id" 
            FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "student_meetings" 
            ADD CONSTRAINT "fk_student_meetings_student_id" 
            FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_meetings_meeting_id" ON "student_meetings" ("meeting_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_meetings_student_id" ON "student_meetings" ("student_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_meetings_unique" ON "student_meetings" ("meeting_id", "student_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_meetings";`);
    }
}

module.exports = CreateStudentMeetingsTable1640000000014;