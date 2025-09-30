const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentGroupRequestsTable1640000000022 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_group_requests" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "student_id" uuid NOT NULL,
                "group_id" uuid NOT NULL,
                "status" group_request_status NOT NULL DEFAULT 'pending',
                "requested_at" timestamp NOT NULL DEFAULT now(),
                "responded_at" timestamp
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_group_requests" 
            ADD CONSTRAINT "fk_student_group_requests_student_id" 
            FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "student_group_requests" 
            ADD CONSTRAINT "fk_student_group_requests_group_id" 
            FOREIGN KEY ("group_id") REFERENCES "student_groups" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_group_requests_group_id" ON "student_group_requests" ("group_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_group_requests_student_id" ON "student_group_requests" ("student_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_group_requests_status" ON "student_group_requests" ("status");`);
        await queryRunner.query(`CREATE INDEX "idx_student_group_requests_requested_at" ON "student_group_requests" ("requested_at");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_group_requests_unique" ON "student_group_requests" ("student_id", "group_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_group_requests";`);
    }
}

module.exports = CreateStudentGroupRequestsTable1640000000022;