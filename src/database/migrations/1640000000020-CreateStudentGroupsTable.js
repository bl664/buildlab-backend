const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentGroupsTable1640000000020 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_groups" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "mentor_id" uuid,
                "title" varchar,
                "description" varchar,
                "status" varchar NOT NULL DEFAULT 'active',
                "created_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraint with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_groups" 
            ADD CONSTRAINT "fk_student_groups_mentor_id" 
            FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_groups_mentor_id" ON "student_groups" ("mentor_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_groups_status" ON "student_groups" ("status");`);
        await queryRunner.query(`CREATE INDEX "idx_student_groups_created_at" ON "student_groups" ("created_at");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_groups";`);
    }
}

module.exports = CreateStudentGroupsTable1640000000020;

