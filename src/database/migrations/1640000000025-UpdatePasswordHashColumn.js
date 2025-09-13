const { MigrationInterface, QueryRunner } = require('typeorm');

class UpdatePasswordHashColumn1640000000025 {
    async up(queryRunner) {
        
        // Fix column names in projects table for consistency
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "techstack" TO "tech_stack";`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "skillsrequired" TO "skills_required";`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "createdat" TO "created_at";`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "updatedat" TO "updated_at";`);
        
        // Fix column name in teams table for consistency
        await queryRunner.query(`ALTER TABLE "teams" RENAME COLUMN "projectassociation" TO "project_association";`);
        await queryRunner.query(`ALTER TABLE "teams" RENAME COLUMN "createdat" TO "created_at";`);
        await queryRunner.query(`ALTER TABLE "teams" RENAME COLUMN "updatedat" TO "updated_at";`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "teams" RENAME COLUMN "updated_at" TO "updatedat";`);
        await queryRunner.query(`ALTER TABLE "teams" RENAME COLUMN "created_at" TO "createdat";`);
        await queryRunner.query(`ALTER TABLE "teams" RENAME COLUMN "project_association" TO "projectassociation";`);
        
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "updated_at" TO "updatedat";`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "created_at" TO "createdat";`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "skills_required" TO "skillsrequired";`);
        await queryRunner.query(`ALTER TABLE "projects" RENAME COLUMN "tech_stack" TO "techstack";`);
        
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password_hash" TO "passwordhash";`);
    }
}

module.exports = UpdatePasswordHashColumn1640000000025;