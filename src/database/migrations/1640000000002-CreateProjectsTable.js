const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateProjectsTable1640000000002 {
    async up(queryRunner) {
        await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" varchar UNIQUE NOT NULL DEFAULT '',
                "description" text NOT NULL DEFAULT '',
                "status" project_status_enum NOT NULL DEFAULT 'pending',
                "start_date" date NOT NULL,
                "end_date" date NOT NULL,
                "tech_stack" text[] DEFAULT ARRAY[]::text[],
                "skills_required" text[] DEFAULT ARRAY[]::text[],
                "github_repo_url" text,
                "github_repo_name" text NOT NULL,
                "is_deleted" boolean DEFAULT false,
                "created_by_id" uuid NOT NULL,
                "updated_by_id" uuid NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "projects"."description" IS 'Content of the project';
        `);

        // Add foreign key constraints with CASCADE DELETE
        await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD CONSTRAINT "fk_projects_created_by_id" 
            FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD CONSTRAINT "fk_projects_updated_by_id" 
            FOREIGN KEY ("updated_by_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "idx_projects_created_by_id" ON "projects" ("created_by_id");`);
        await queryRunner.query(`CREATE INDEX "idx_projects_updated_by_id" ON "projects" ("updated_by_id");`);
        await queryRunner.query(`CREATE INDEX "idx_projects_dates" ON "projects" ("start_date", "end_date");`);
        await queryRunner.query(`CREATE INDEX "idx_projects_status" ON "projects" ("status");`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "projects";`);
    }
}

module.exports = CreateProjectsTable1640000000002;
// const { MigrationInterface, QueryRunner, Table } = require("typeorm");

// class CreateProjectsTable1640000000001 {
//     async up(queryRunner) {
//         try {
//             console.log('Starting CreateProjectsTable migration...');

//             // Create enum type for project status
//             await queryRunner.query(`
//                 DO $$ BEGIN
//                     CREATE TYPE projects_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');
//                 EXCEPTION
//                     WHEN duplicate_object THEN null;
//                 END $$;
//             `);

//             // Create projects table
//             await queryRunner.createTable(new Table({
//                 name: "projects",
//                 columns: [
//                     {
//                         name: "id",
//                         type: "uuid",
//                         isPrimary: true,
//                         generationStrategy: "uuid",
//                         default: "gen_random_uuid()"
//                     },
//                     {
//                         name: "name",
//                         type: "varchar",
//                         isNullable: false,
//                         isUnique: true,
//                         default: "''"
//                     },
//                     {
//                         name: "description",
//                         type: "text",
//                         isNullable: false,
//                         default: "''"
//                     },
//                     {
//                         name: "status",
//                         type: "enum",
//                         enumName: "projects_status_enum",
//                         enum: ["pending", "in_progress", "completed", "cancelled", "on_hold"],
//                         default: "'pending'",
//                         isNullable: false
//                     },
//                     {
//                         name: "start_date",
//                         type: "date",
//                         isNullable: false
//                     },
//                     {
//                         name: "end_date",
//                         type: "date",
//                         isNullable: false
//                     },
//                     {
//                         name: "created_by_id",
//                         type: "uuid",
//                         isNullable: false
//                     },
//                     {
//                         name: "updated_by_id",
//                         type: "uuid",
//                         isNullable: false
//                     },
//                     {
//                         name: "createdat",
//                         type: "timestamp",
//                         default: "CURRENT_DATE",
//                         isNullable: false
//                     },
//                     {
//                         name: "updatedat",
//                         type: "timestamp",
//                         default: "CURRENT_DATE",
//                         isNullable: false
//                     },
//                     {
//                         name: "techstack",
//                         type: "text",
//                         isArray: true,
//                         default: "ARRAY[]::text[]",
//                         isNullable: true
//                     },
//                     {
//                         name: "skillsrequired",
//                         type: "text",
//                         isArray: true,
//                         default: "ARRAY[]::text[]",
//                         isNullable: true
//                     },
//                     {
//                         name: "github_repo_url",
//                         type: "text",
//                         isNullable: true
//                     },
//                     {
//                         name: "github_repo_name",
//                         type: "text",
//                         isNullable: false
//                     }
//                 ]
//             }));

//             console.log('✅ CreateProjectsTable migration completed successfully.');
//         } catch (error) {
//             console.error('❌ Error in CreateProjectsTable migration:', error);
//             throw error;
//         }
//     }

//     async down(queryRunner) {
//         try {
//             console.log('Rolling back CreateProjectsTable migration...');
//             await queryRunner.dropTable("projects", true);
//             await queryRunner.query(`DROP TYPE IF EXISTS projects_status_enum CASCADE;`);
//             console.log('✅ CreateProjectsTable migration rolled back successfully.');
//         } catch (error) {
//             console.error('❌ Error rolling back CreateProjectsTable migration:', error);
//             throw error;
//         }
//     }
// }

// module.exports = CreateProjectsTable1640000000001;
