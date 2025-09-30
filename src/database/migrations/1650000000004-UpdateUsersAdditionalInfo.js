class UpdateUsersAdditionalInfo1650000000004 {
    async up(queryRunner) {
        // Create table only if it does not already exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS users_additional_info (  
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                verification_token TEXT DEFAULT NULL,
                verification_token_expires TIMESTAMP,
                CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            DROP TABLE IF EXISTS users_additional_info;
        `);
    }
}

module.exports = UpdateUsersAdditionalInfo1650000000004;


