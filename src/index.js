// src/index.js
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const corsMiddleware = require('./middleware/cors');
const allRoutes = require('./routes');

function createApp({ helmetMiddleware, generalLimiter, authLimiter, speedLimiter }) {
  const app = express();

  app.set('trust proxy', 1);

  // Security
  app.use(helmetMiddleware);

  // Compression
  app.use(compression());

  // CORS
app.use(corsMiddleware);
  // Rate limiting
  app.use(generalLimiter);
  app.use(speedLimiter);

  
  

  // Body parsers
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser
  app.use(cookieParser());

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  // Routes
  app.use('/', allRoutes);

  // 404
  app.use('*', (req, res) => {
    console.warn(`404 - Route not found: ${req.originalUrl}`);
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
  });


  return app;
}

module.exports = createApp;
