// app.js
const http = require('http');
const cluster = require('cluster');
const os = require('os');
const gracefulShutdown = require('http-graceful-shutdown');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const APP_CONFIG = require('./config');
const initializeSocket = require('./src/routes/messages/socket');
const createApp = require('./src'); 

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, skipSuccessfulRequests: true });
const speedLimiter = slowDown({ windowMs: 15 * 60 * 1000, delayAfter: 20, delayMs: () => 500 });

// ---------------- Clustering ----------------
if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  console.log(`Master ${process.pid} running with ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on('exit', (worker) => {
    console.error(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = createApp({ helmetMiddleware, generalLimiter, authLimiter, speedLimiter });
  const PORT = APP_CONFIG.SERVER_PORT || 5001;

  const server = http.createServer(app);

  // Init Socket.IO
  const io = initializeSocket(server);
  app.set('io', io);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    gracefulShutdown(server, {
      signals: 'SIGINT SIGTERM',
      timeout: 30000,
      onShutdown: () => console.log('Server is shutting down'),
      finally: () => console.log('Server gracefully shut down'),
    });
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      throw error;
    }
  });
}


// const express = require('express');
// const http = require('http');
// const cookieParser = require('cookie-parser');
// const APP_CONFIG = require('./config');
// const authRoutes = require('./src/routes');
// const corsMiddleware = require('./src/./middleware/cors');
// const initializeSocket = require('./src/routes/messages/socket'); 
// const app = express();
// const PORT = APP_CONFIG.SERVER_PORT || 5001;

// const server = http.createServer(app);

// const io = initializeSocket(server);
// app.set('io', io);

// app.use(corsMiddleware); 

// app.use(express.json());
// app.use(cookieParser());

// app.use('/', authRoutes);

// // Start the server
// server.listen(PORT, () => {
//   console.log(`Auth service is running on port ${PORT}`);
// });
