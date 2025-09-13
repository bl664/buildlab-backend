const { MigrationInterface, QueryRunner } = require('typeorm');

class AlterStudentGroupsAddMaxMembersAndTags1640000000030 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "student_groups"
      ADD COLUMN "max_members" integer;
    `);

    await queryRunner.query(`
      ALTER TABLE "student_groups"
      ADD COLUMN "tags" text[];
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "student_groups"
      DROP COLUMN "tags";
    `);

    await queryRunner.query(`
      ALTER TABLE "student_groups"
      DROP COLUMN "max_members";
    `);
  }
}

module.exports = AlterStudentGroupsAddMaxMembersAndTags1640000000030;
