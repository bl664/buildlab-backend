const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class AddRoleToStudentTeams1690000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TYPE "student_team_role_enum" AS ENUM ('team_lead', 'designer', 'developer', 'qa');
        `);

        await queryRunner.query(`
            ALTER TABLE "student_teams" 
            ADD COLUMN "role" "student_team_role_enum" NOT NULL DEFAULT 'developer';
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "student_teams" DROP COLUMN "role";`);
        await queryRunner.query(`DROP TYPE "student_team_role_enum";`);
    }
};
