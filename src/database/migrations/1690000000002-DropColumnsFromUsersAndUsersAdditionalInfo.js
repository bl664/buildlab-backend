
class DropColumnsFromUsersAndUsersAdditionalInfo1690000000002 {
    async up(queryRunner) {
        // Drop columns from users table
        await queryRunner.query(`
            ALTER TABLE users
            DROP COLUMN IF EXISTS name,
            DROP COLUMN IF EXISTS email,
            DROP COLUMN IF EXISTS role;
        `);

        // Drop role column from users_additional_info
        await queryRunner.query(`
            ALTER TABLE users_additional_info
            DROP COLUMN IF EXISTS role;
        `);
    }

    async down(queryRunner) {
        // Re-add dropped columns (make sure types match your original schema!)
        await queryRunner.query(`
            ALTER TABLE users
            ADD COLUMN name VARCHAR,
            ADD COLUMN email VARCHAR,
            ADD COLUMN role users_role_enum;
        `);

        await queryRunner.query(`
            ALTER TABLE users_additional_info
            ADD COLUMN role users_role_enum NOT NULL DEFAULT 'member';
        `);
    }
}

module.exports = DropColumnsFromUsersAndUsersAdditionalInfo1690000000002;
