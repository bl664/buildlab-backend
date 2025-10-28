class AddColumnAndIndexesToUsersInfo1690000000004 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users_additional_info
      ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_users_unverified_created 
      ON users(created_at) WHERE verified = false;

      CREATE INDEX IF NOT EXISTS idx_messaging_users_email_lower 
      ON messaging_users(LOWER(email));

      CREATE INDEX IF NOT EXISTS idx_verification_token 
      ON users_additional_info(verification_token) 
      WHERE verification_token IS NOT NULL;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users_additional_info 
      DROP COLUMN IF EXISTS verification_attempts;

      DROP INDEX IF EXISTS idx_users_unverified_created;
      DROP INDEX IF EXISTS idx_messaging_users_email_lower;
      DROP INDEX IF EXISTS idx_verification_token;
    `);
  }
}

module.exports = AddColumnAndIndexesToUsersInfo1690000000004;


