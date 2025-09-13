const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

dotenv.config();

const migrationConfig = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'buildlabapp',
    
    // Migration specific settings
    migrations: ['src/database/migrations/*.js'],
    migrationsTableName: 'migrations_history',
    
    // Connection pool settings for production
    extra: {
        max: 20, 
        min: 2,  
        acquire: 60000,
        idle: 10000, 
        evict: 1000,    
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 600000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
    },
    
    // Logging
    logging: process.env.NODE_ENV === 'development' ? 'all' : ['error', 'warn'],
    logger: 'advanced-console',
    
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    
    // Synchronization disabled for production safety
    synchronize: false,
    
    // Migration settings
    migrationsRun: false, // Don't auto-run migrations
    dropSchema: false,    // Never drop schema
};

const AppDataSource = new DataSource(migrationConfig);

module.exports = { AppDataSource, migrationConfig };