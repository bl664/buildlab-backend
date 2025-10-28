
class CreateStudentGroupProjectsTable1690000000005 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "student_group_projects" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "group_id" uuid NOT NULL REFERENCES "student_groups"("id") ON DELETE CASCADE,
        "title" varchar,
        "description" varchar,
        "status" varchar NOT NULL DEFAULT '1',
        "tags" text[],
        "techstack" text[] DEFAULT ARRAY[]::text[],
        "skillsrequired" text[] DEFAULT ARRAY[]::text[],
        "level" varchar NOT NULL DEFAULT '0'
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_student_group_projects_group_id" ON "student_group_projects" ("group_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_group_projects_status" ON "student_group_projects" ("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_group_projects_level" ON "student_group_projects" ("level");
    `);

    // Optional comments for clarity
    await queryRunner.query(`
      COMMENT ON TABLE "student_group_projects" IS 'Stores projects created within student groups';
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE "student_group_projects";`);
  }
}

module.exports = CreateStudentGroupProjectsTable1690000000005;
