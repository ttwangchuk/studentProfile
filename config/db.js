const pgp = require("pg-promise")();
require("dotenv").config();

const sslConfig = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;

const db = pgp({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: sslConfig,
});

module.exports = db;
