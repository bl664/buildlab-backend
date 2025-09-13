const bodyParser = require("body-parser");
const cors = require("cors");
const APP_CONFIG = require('../../config')

const allowedOrigins = APP_CONFIG.CORS_TRUSTED_ORIGIN;

const corsOptions = {
    origin: (origin, callback) => {
        console.log(`Origin: ${origin}`); // Log the origin of each request
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            console.log('CORS allowed for origin:', origin);
            callback(null, true);
        } else {
            console.log('CORS rejected for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
};

function setupMiddleware(app) {
    app.use((req, res, next) => {
        console.log(`Request received: ${req.method} ${req.url}`);
        next();
    });
    app.use(cors(corsOptions));
    app.use(bodyParser.json({ limit: "50mb" }));
    app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
}

setupMiddleware.corsOptions = corsOptions; // Export corsOptions for use in app.js

module.exports = { setupMiddleware };