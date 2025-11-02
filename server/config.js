require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'dengue-gis-secret-key-change-in-production',
    dbPath: './database.sqlite',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8000'
};
