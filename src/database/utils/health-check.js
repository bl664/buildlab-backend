const { MigrationRunner } = require('./migration-runner');

class DatabaseHealthCheck {
    static async performHealthCheck() {
        const runner = new MigrationRunner();
        
        try {
            console.log('Starting database health check...');
            
            await runner.initialize();
            
            // Check connection
            await runner.dataSource.query('SELECT 1');
            console.log('✓ Database connection OK');
            
            // Check migrations
            const status = await runner.checkMigrationStatus();
            if (status.hasUnexecuted) {
                console.log('⚠ Warning: Pending migrations detected');
                return { healthy: false, issue: 'pending_migrations' };
            }
            console.log('✓ Migrations up to date');
            
            // Validate schema
            await runner.validateDatabase();
            console.log('✓ Database schema validation passed');
            
            console.log('Database health check completed successfully');
            return { healthy: true };
            
        } catch (error) {
            console.error('Database health check failed:', error);
            return { healthy: false, error: error.message };
        } finally {
            await runner.destroy();
        }
    }
}

module.exports = { DatabaseHealthCheck };
