const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateStudentGroupMembersTable1640000000021 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "student_group_members" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "group_id" uuid NOT NULL,
                "student_id" uuid NOT NULL,
                "joined_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "student_group_members" 
            ADD CONSTRAINT "fk_student_group_members_group_id" 
            FOREIGN KEY ("group_id") REFERENCES "student_groups" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "student_group_members" 
            ADD CONSTRAINT "fk_student_group_members_student_id" 
            FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_student_group_members_group_id" ON "student_group_members" ("group_id");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_group_members_student_id" ON "student_group_members" ("student_id");`);
        await queryRunner.query(`CREATE INDEX "idx_student_group_members_joined_at" ON "student_group_members" ("joined_at");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_student_group_members_unique" ON "student_group_members" ("group_id", "student_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "student_group_members";`);
    }
}

module.exports = CreateStudentGroupMembersTable1640000000021;