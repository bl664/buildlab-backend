const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateUsersAdditionalInfoTable1640000000027 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS users_additional_info (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role users_role_enum NOT NULL DEFAULT 'member',
                verified BOOLEAN DEFAULT false,
                has_group BOOLEAN DEFAULT false
            );
        `);

        await queryRunner.query(`
            ALTER TABLE "users_additional_info" 
            ADD CONSTRAINT "fk__additional_info_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`CREATE INDEX "idx_additional_info_user_id" ON "users_additional_info" ("user_id");`);
        await queryRunner.query(`CREATE INDEX "idx_additional_info_role" ON "users_additional_info" ("role");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            DROP TABLE IF EXISTS users_additional_info;
        `);
    }
}

module.exports = CreateUsersAdditionalInfoTable1640000000027;
