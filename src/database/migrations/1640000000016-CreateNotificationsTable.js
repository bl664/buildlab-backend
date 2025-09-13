const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateNotificationsTable1640000000016 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "type" varchar NOT NULL,
                "content" text NOT NULL,
                "url" text,
                "is_read" boolean DEFAULT false,
                "created_by" uuid,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now()
            );
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "notifications"."type" IS 'e.g., task_assigned, team_invite, feedback_given';
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "notifications"."url" IS 'Optional link to redirect on click';
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "notifications"."created_by" IS 'Who triggered the notification';
        `);

        // Add foreign key constraint with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "notifications" 
            ADD CONSTRAINT "fk_notifications_created_by" 
            FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_notifications_created_by" ON "notifications" ("created_by");`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created_at" ON "notifications" ("created_at");`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_type" ON "notifications" ("type");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "notifications";`);
    }
}

module.exports = CreateNotificationsTable1640000000016;