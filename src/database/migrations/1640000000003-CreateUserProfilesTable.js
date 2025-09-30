const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateUserProfilesTable1640000000003 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "user_profiles" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid UNIQUE NOT NULL,
                "full_name" varchar(100) NOT NULL,
                "headline" varchar(150),
                "bio" text,
                "profile_picture" text,
                "specialization" varchar[],
                "location" varchar(100),
                "linkedin_url" text,
                "github_url" text,
                "website_url" text,
                "experience" jsonb,
                "education" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now()
            );
        `);

        // Add foreign key constraint with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "user_profiles" 
            ADD CONSTRAINT "fk_user_profiles_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" ("user_id");`);
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_full_name" ON "user_profiles" ("full_name");`);
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_location" ON "user_profiles" ("location");`);
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_specialization" ON "user_profiles" ("specialization");`);
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_experience" ON "user_profiles" ("experience");`);
        await queryRunner.query(`CREATE INDEX "idx_user_profiles_education" ON "user_profiles" ("education");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "user_profiles";`);
    }
}

module.exports = CreateUserProfilesTable1640000000003;
