//Db.js File for connecting

require('dotenv').config();
const mysql = require('mysql2');

// Create database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "Max1022!",
    database: process.env.DB_NAME || "conference_reservation",
    port: process.env.DB_PORT || 3306
});

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error("Database connection failed: " + err.message);
    } else {
        console.log("Connected to MySQL database.");
    }
});

module.exports = db;
