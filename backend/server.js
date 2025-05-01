// Server node
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "SuperSecretKey";

app.use(cors());
app.use(cors({ origin: 'http://192.168.1.106:8080' }));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Node.js server is running...");
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM admins WHERE username = ?";
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const admin = results[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ adminId: admin.id, username: admin.username }, SECRET_KEY, { expiresIn: '2h' });

        res.json({ message: "Login successful!", token });
    });
});

function authenticateAdmin(req, res, next) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({ error: "Unauthorized. No token provided." });
    }

    jwt.verify(token.replace("Bearer ", ""), SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Invalid or expired token." });
        }
        req.admin = decoded;
        next();
    });
}

app.get('/reservations', authenticateAdmin, (req, res) => {
    db.query("SELECT * FROM reservations", (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json(results);
    });
});

// Delete a reservation by ID (Admin Only)
app.delete('/delete-reservation/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM reservations WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Reservation not found." });
        }

        res.json({ message: "Reservation deleted successfully!" });
    });
});

app.get('/public-reservations', (req, res) => {
    db.query("SELECT * FROM reservations WHERE status = 'approved'", (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json(results);
    });
});

app.get('/reservations-by-date', (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: "Date is required." });
    }

    const sql = "SELECT * FROM reservations WHERE date = ?";
    db.query(sql, [date], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }
        res.json(results);
    });
});


const cron = require("node-cron");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "atu.reservations@gmail.com",
        pass: "gjnitzedoxafytku"
    }
});

app.post('/reserve', (req, res) => {
    const { name, email, date, time_slot, reason } = req.body;

    if (!name || !email || !date || !time_slot || !reason) {
        return res.status(400).json({ error: "All fields (name, email, date, time_slot, reason) are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    if (selectedDate < today) {
        return res.status(400).json({ error: "Reservation date must be in the future." });
    }

    const validTimeSlots = [
        "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM",
        "12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM",
        "5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM"
    ];
    if (!validTimeSlots.includes(time_slot)) {
        return res.status(400).json({ error: "Invalid time slot selected." });
    }

    const checkDuplicateSql = "SELECT * FROM reservations WHERE date = ? AND time_slot = ?";
    db.query(checkDuplicateSql, [date, time_slot], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: "This time slot is already booked for the selected date." });
        }

        const status = reason.toLowerCase() === 'admin' ? 'approved' : 'pending';

        const insertSql = `
            INSERT INTO reservations (name, email, date, time_slot, reason, status)
            VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(insertSql, [name, email, date, time_slot, reason, status], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Database error", details: err });
            }

            // Send confirmation email
            const mailOptions = {
                from: '"ATU Reservations" <your-email@gmail.com>',
                to: email,
                subject: "Reservation Submission Confirmation",
                text: `Dear ${name},

Thank you for your reservation request for ${date} during ${time_slot}. Your request has been received and will be reviewed within 24 hours.

If you have any questions or need to make changes, please contact the admin at admin@atu.edu.

Best regards,
ATU Reservations Team`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Email error:", error);
                } else {
                    console.log("Confirmation email sent:", info.response);
                }
            });

            res.json({ message: "Reservation request submitted successfully!" });
        });
    });
});

app.get('/check-admin', authenticateAdmin, (req, res) => {
    res.json({ isAdmin: true, admin: req.admin });
});

app.put('/reservations/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["approved", "denied", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value." });
    }

    const sql = "UPDATE reservations SET status = ? WHERE id = ?";
    db.query(sql, [status, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Reservation not found." });
        }

        res.json({ message: "Reservation updated successfully!" });
    });
});

// NEW: Delete a blackout (admin) reservation
app.delete('/delete-blackout/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM reservations WHERE id = ? AND reason = 'admin'";
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Reservation not found or not an admin blackout." });
        }
        res.json({ message: "Blackout reservation deleted successfully." });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

function sendPendingEmailSummary() {
    const sql = "SELECT COUNT(*) AS pendingCount FROM reservations WHERE status = 'pending'";
    db.query(sql, (err, results) => {
        if (err) {
            return console.error("Error checking pending reservations:", err);
        }

        const pendingCount = results[0].pendingCount;
        const now = new Date().toLocaleString();

        const mailOptions = {
            from: "atu.reservations@gmail.com",
            to: "rtorres5@atu.edu",
            subject: "Pending Reservations Notification",
            text: `As of ${now}, you have ${pendingCount} reservation(s) pending approval.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log(`Pending summary email sent: ${info.response}`);
            }
        });
    });
}

cron.schedule("0 8,30 10,20 * * *", () => {
    console.log("Running scheduled pending reservations email check...");
    sendPendingEmailSummary();
});
