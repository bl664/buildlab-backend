const { MigrationRunner } = require('../src/database/utils/migration-runner');

async function runMigrations() {
    const runner = new MigrationRunner();

    try {
        console.log('=== Starting Database Migration Process ===');

        await runner.initialize();
        console.log("initialized", runner.isConnected);

        // Check and run migrations
        const result = await runner.runMigrations();

        if (result.migrationsRun > 0) {
            console.log(`Migration completed! Ran ${result.migrationsRun} migrations`);
        } else {
            console.log('Database is already up to date');
        }

        // Validate only after running
        const validation = await runner.validateDatabase();
        if (validation.valid) {
            console.log('=== Migration Process Completed Successfully ===');
        }

    } catch (error) {
        console.error('=== Migration Process Failed ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await runner.destroy();
    }
}

// Handle different command line arguments
const command = process.argv[2];

switch (command) {
    case 'run':
        runMigrations();
        break;
    case 'revert':
        revertLastMigration();
        break;
    case 'status':
        checkStatus();
        break;
    default:
        console.log('Available commands:');
        console.log('  npm run migrate:run    - Run pending migrations');
        console.log('  npm run migrate:revert - Revert last migration');
        console.log('  npm run migrate:status - Check migration status');
        break;
}

async function revertLastMigration() {
    const runner = new MigrationRunner();
    try {
        await runner.initialize();
        await runner.revertMigration();
        console.log('Migration reverted successfully');
    } catch (error) {
        console.error('Failed to revert migration:', error);
        process.exit(1);
    } finally {
        await runner.destroy();
    }
}

async function checkStatus() {
    const runner = new MigrationRunner();
    try {
        await runner.initialize();
        const status = await runner.checkMigrationStatus();
        
        console.log('=== Migration Status ===');
        console.log(`Executed: ${status.executed.length} migrations`);
        console.log(`Pending: ${status.pending.length} migrations`);
        
        if (status.executed.length > 0) {
            console.log('\nExecuted migrations:');
            status.executed.forEach(m => {
                console.log(`  - ${m.name} (${new Date(m.timestamp).toISOString()})`);
            });
        }
        
        if (status.pending.length > 0) {
            console.log('\nPending migrations:');
            status.pending.forEach(m => {
                console.log(`  - ${m.name}`);
            });
        }
        
    } catch (error) {
        console.error('Failed to check status:', error);
        process.exit(1);
    } finally {
        await runner.destroy();
    }
}
