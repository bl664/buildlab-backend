const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateTriggersForUpdatedAt1640000000026 {
    async up(queryRunner) {
        // Create a function to update the updated_at column
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Create triggers for all tables with updated_at columns
        const tablesWithUpdatedAt = [
            'users',
            'projects',
            'user_profiles',
            'tasks',
            'teams',
            'student_projects',
            'mentor_projects',
            'student_teams',
            'github_users',
            'notifications',
            'messaging_users'
        ];

        for (const table of tablesWithUpdatedAt) {
            await queryRunner.query(`
                CREATE TRIGGER update_${table}_updated_at
                    BEFORE UPDATE ON ${table}
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);
        }
    }

    async down(queryRunner) {
        const tablesWithUpdatedAt = [
            'users',
            'projects',
            'user_profiles',
            'tasks',
            'teams',
            'student_projects',
            'mentor_projects',
            'student_teams',
            'github_users',
            'notifications',
            'messaging_users'
        ];

        for (const table of tablesWithUpdatedAt) {
            await queryRunner.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};`);
        }

        await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
    }
}

module.exports = CreateTriggersForUpdatedAt1640000000026;