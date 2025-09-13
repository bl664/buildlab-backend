const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateExtensions1640000000024 {
    async up(queryRunner) {
        // Create the uuid-ossp extension for UUID generation
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        
        // Create the btree_gin extension for better indexing on arrays
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gin";`);
        
        // Create additional GIN indexes for array columns
        await queryRunner.query(`CREATE INDEX "idx_projects_tech_stack_gin" ON "projects" USING GIN ("tech_stack");`);
        await queryRunner.query(`CREATE INDEX "idx_projects_skills_required_gin" ON "projects" USING GIN ("skills_required");`);
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_specialization_gin" ON "user_profiles" USING GIN ("specialization");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_profiles_specialization_gin";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_skills_required_gin";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_tech_stack_gin";`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "btree_gin";`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp";`);
    }
}

module.exports = CreateExtensions1640000000024;
