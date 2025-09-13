const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateNotificationRecipientsTable1640000000017 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "notification_recipients" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "notification_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "is_read" boolean DEFAULT false
            );
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "notification_recipients" 
            ADD CONSTRAINT "fk_notification_recipients_notification_id" 
            FOREIGN KEY ("notification_id") REFERENCES "notifications" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "notification_recipients" 
            ADD CONSTRAINT "fk_notification_recipients_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_notification_recipients_notification_id" ON "notification_recipients" ("notification_id");`);
        await queryRunner.query(`CREATE INDEX "idx_notification_recipients_user_id" ON "notification_recipients" ("user_id");`);
        await queryRunner.query(`CREATE INDEX "idx_notification_recipients_is_read" ON "notification_recipients" ("is_read");`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_notification_recipients_unique" ON "notification_recipients" ("notification_id", "user_id");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "notification_recipients";`);
    }
}

module.exports = CreateNotificationRecipientsTable1640000000017;