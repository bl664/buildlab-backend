class CreateUsersAdditionalInfoTable1690000000001 {
    async up(queryRunner) {
        // Ensure pgcrypto is available for gen_random_uuid()
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS users_additional_info (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                verification_token TEXT DEFAULT NULL,
                verification_token_expires TIMESTAMP
            );
        `);

        await queryRunner.query(`
            ALTER TABLE "users_additional_info" 
            ADD CONSTRAINT "fk__additional_info_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_additional_info_user_id" 
            ON "users_additional_info" ("user_id");
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            DROP TABLE IF EXISTS users_additional_info;
        `);
    }
}

module.exports = CreateUsersAdditionalInfoTable1690000000001;
