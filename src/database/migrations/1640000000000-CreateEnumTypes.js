const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateEnumTypes1640000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TYPE "users_role_enum" AS ENUM (
                'admin',
                'mentor',
                'student',
                'member'
            );
        `);

        await queryRunner.query(`
            CREATE TYPE "project_status_enum" AS ENUM (
                'pending',
                'active',
                'completed',
                'archived'
            );
        `);

        await queryRunner.query(`
            CREATE TYPE "tasks_status_enum" AS ENUM (
                'pending',
                'in_progress',
                'completed',
                'blocked'
            );
        `);

        await queryRunner.query(`
            CREATE TYPE "tasks_priority_enum" AS ENUM (
                'low',
                'medium',
                'high',
                'critical'
            );
        `);

        await queryRunner.query(`
            CREATE TYPE "task_status" AS ENUM (
                'pending',
                'in_progress',
                'completed',
                'blocked'
            );
        `);

        await queryRunner.query(`
            CREATE TYPE "group_request_status" AS ENUM (
                'pending',
                'approved',
                'rejected',
                'expired'
            );
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TYPE IF EXISTS "group_request_status";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "task_status";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tasks_priority_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "project_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
    }
}

module.exports = CreateEnumTypes1640000000000;
