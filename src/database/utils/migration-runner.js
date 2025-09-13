const { AppDataSource } = require('../config/migration-config');

class MigrationRunner {
    constructor() {
        this.dataSource = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            console.log('Initializing database connection...');
            this.dataSource = AppDataSource;
            await this.dataSource.initialize();
            this.isConnected = true;
            console.log('Database connection established successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize database connection:', error);
            throw error;
        }
    }

    async runMigrations() {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            console.log('Starting migration process...');
            
            // Check pending migrations
            const pendingMigrations = await this.dataSource.showMigrations();
            console.log(`Found ${pendingMigrations.length} pending migrations`);

            if (pendingMigrations.length === 0) {
                console.log('No pending migrations to run');
                return { success: true, migrationsRun: 0 };
            }

            // Run migrations with transaction
            const migrations = await this.dataSource.runMigrations({
                transaction: 'each', // Run each migration in its own transaction
            });

            console.log(`Successfully ran ${migrations.length} migrations`);
            return { success: true, migrationsRun: migrations.length, migrations };

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    async revertMigration() {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            console.log('Reverting last migration...');
            const result = await this.dataSource.undoLastMigration({
                transaction: 'each'
            });
            
            console.log('Migration reverted successfully');
            return result;
        } catch (error) {
            console.error('Migration revert failed:', error);
            throw error;
        }
    }

async checkMigrationStatus() {
    try {
        if (!this.isConnected) {
            await this.initialize();
        }

        const executed = await this.dataSource.migrations; // Loaded migrations
        const pending = await this.dataSource.showMigrations();

        return {
            executed: [], // Optional: You could fetch actual executed list if needed
            pending,
            hasUnexecuted: pending.length > 0
        };
    } catch (error) {
        console.error('Failed to check migration status:', error);
        throw error;
    }
}


    async validateDatabase() {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            // Check if critical tables exist
            const tables = await this.dataSource.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            `);

            const requiredTables = ['users', 'projects'];
            const existingTables = tables.map(t => t.table_name);
            console.log('Existing tables:', existingTables);
            const missingTables = requiredTables.filter(table => !existingTables.includes(table));
console.log('Missing tables:', missingTables);
            if (missingTables.length > 0) {
                throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
            }

            console.log('Database validation passed');
            return { valid: true, tables: existingTables };
        } catch (error) {
            console.error('Database validation failed:', error);
            throw error;
        }
    }

    async destroy() {
        try {
            if (this.isConnected && this.dataSource) {
                await this.dataSource.destroy();
                this.isConnected = false;
                console.log('Database connection closed');
            }
        } catch (error) {
            console.error('Error closing database connection:', error);
        }
    }
}

module.exports = { MigrationRunner };