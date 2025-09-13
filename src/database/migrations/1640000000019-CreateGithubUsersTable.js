const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateGithubUsersTable1640000000019 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "github_users" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "github_id" bigint UNIQUE NOT NULL,
                "github_user_name" varchar(255) NOT NULL,
                "avatar_url" text,
                "html_url" text,
                "type" varchar(100),
                "site_admin" boolean NOT NULL DEFAULT false,
                "public_repos" int NOT NULL DEFAULT 0,
                "public_gists" int NOT NULL DEFAULT 0,
                "followers" int NOT NULL DEFAULT 0,
                "following" int NOT NULL DEFAULT 0,
                "created_at_github" timestamp,
                "updated_at_github" timestamp,
                "github_token" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraint with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "github_users" 
            ADD CONSTRAINT "fk_github_users_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_github_users_user_id" ON "github_users" ("user_id");`);
        await queryRunner.query(`CREATE INDEX "idx_github_users_github_user_name" ON "github_users" ("github_user_name");`);
        await queryRunner.query(`CREATE INDEX "idx_github_users_github_id" ON "github_users" ("github_id");`);
        await queryRunner.query(`CREATE INDEX "idx_github_users_type" ON "github_users" ("type");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "github_users";`);
    }
}

module.exports = CreateGithubUsersTable1640000000019;