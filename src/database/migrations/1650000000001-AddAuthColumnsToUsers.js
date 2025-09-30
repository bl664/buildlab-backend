class AddAuthColumnsToUsers1650000000001 {
    async up(queryRunner) {
        // Add new columns for login security
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT DEFAULT NULL;
        `);
    }

    async down(queryRunner) {
        // Drop the columns if rollback is needed
        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS failed_login_attempts,
            DROP COLUMN IF EXISTS lockout_until,
            DROP COLUMN IF EXISTS refresh_token_hash;
        `);
    }
}

module.exports = AddAuthColumnsToUsers1650000000001;

