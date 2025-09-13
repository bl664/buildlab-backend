const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const APP_CONFIG = require('../../config');
const fs = require('fs');
const path = require('path');

console.log(APP_CONFIG);

const logger = createLogger({
  level: APP_CONFIG.LOG_LEVEL,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'auth-service' },
  transports: []
});

if (process.env.NODE_ENV !== 'test') {
    logger.add(new transports.Console({
        format: format.combine(
        format.colorize(),
        format.simple()
        )
    }));
}

// Use DailyRotateFile for all environments
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production') {
    // Ensure Log Directory Exist
    const logDir = APP_CONFIG.LOG_FILE_DIRECTORY;
    if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    }

    console.log("LOG DIR is", logDir);
    logger.add(new DailyRotateFile({
        filename: path.join(logDir, `${APP_CONFIG.LOG_FILE_NAME}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d' // keep logs for 14 days
    }));
}

module.exports = logger;