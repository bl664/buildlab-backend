const { MigrationInterface, QueryRunner } = require("typeorm");

class MakeUserIdUniqueInUsersAdditionalInfo1690000000003 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users_additional_info
      ADD CONSTRAINT uq_users_additional_info_user_id UNIQUE (user_id)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users_additional_info
      DROP CONSTRAINT uq_users_additional_info_user_id
    `);
  }
};

module.exports = MakeUserIdUniqueInUsersAdditionalInfo1690000000003;
