// JavaScript source code
const bcrypt = require('bcrypt');
const db = require('./db'); // Import database connection

const username = "admin";  // Change this if needed
const password = "Atu01!";  // Change this to a strong password

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }

    const sql = "INSERT INTO admins (username, password) VALUES (?, ?)";
    db.query(sql, [username, hash], (err, result) => {
        if (err) {
            console.error("Error inserting admin:", err);
            return;
        }
        console.log("Admin created successfully!");
        process.exit(); // Exit script after completion
    });
});
