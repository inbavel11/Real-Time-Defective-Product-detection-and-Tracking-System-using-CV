const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const app = express();
const cors = require('cors');
const mysql2 = require('mysql2');   
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'rec',
    password: 'rec@123',
    database: 'defect_detection'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        throw err;
    }
    console.log('Connected to database');
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dinamanihindu@gmail.com',
        pass: 'brdd oynd ttsy dfrc' // Replace 'your-app-password' with the 16-character app password
    }
});

app.post('/register', (req, res) => {
    const { username, email, password, repeat_password } = req.body;

    if (password !== repeat_password) {
        return res.status(400).send('Passwords do not match');
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const otp = crypto.randomInt(100000, 999999).toString();

    const query = 'INSERT INTO temp_users (username, email, password, otp) VALUES (?, ?, ?, ?)';
    db.query(query, [username, email, hashedPassword, otp], (err, result) => {
        if (err) {
            console.error('Error registering user:', err);
            return res.status(500).send('Error registering user');
        }

        const mailOptions = {
            from: 'dinamanihindu@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending OTP:', error);
                return res.status(500).send('Error sending OTP');
            }
            res.status(200).send('Registration successful! Please check your email for the OTP.');
        });
    });
});

app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    const query = 'SELECT * FROM temp_users WHERE email = ? AND otp = ?';
    db.query(query, [email, otp], (err, results) => {
        if (err) {
            console.error('Error verifying OTP:', err);
            return res.status(500).send('Error verifying OTP');
        }
        if (results.length === 0) {
            return res.status(400).send('Invalid OTP');
        }

        const user = results[0];
        const insertUserQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(insertUserQuery, [user.username, user.email, user.password], (err, result) => {
            if (err) {
                console.error('Error storing user:', err);
                return res.status(500).send('Error storing user');
            }

            const deleteTempUserQuery = 'DELETE FROM temp_users WHERE email = ?';
            db.query(deleteTempUserQuery, [email], (err, result) => {
                if (err) {
                    console.error('Error deleting temp user:', err);
                    return res.status(500).send('Error deleting temp user');
                }
                res.status(200).send('OTP verified successfully and user registered.');
            });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error logging in:', err);
            return res.status(500).send('Error logging in');
        }
        if (results.length === 0) {
            return res.status(400).send('No user found with that email');
        }

        const user = results[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).send('Invalid password');
        }

res.status(200).send('Login successful');    
    });
});

app.post('/send-message', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).send('All fields are required.');
    }

    const mailOptions = {
        from: 'dinamanihindu@gmail.com',
        to: email, // Replace with your support email
        subject: `New Contact Us Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending message:', error);
            return res.status(500).send('Failed to send message. Please try again.');
        }
        res.status(200).send('Message sent successfully. Thank you for contacting us!');
    });
});

app.use(cors());

const db1 = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chocolate_factory',
});

db1.connect(err => {
    if (err) throw err;
    console.log("Connected to MySQL database.");
});

app.get('/defects', (req, res) => {
    const query = 'SELECT * FROM defect_detection ORDER BY timestamp DESC';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});
app.post('/add-work', (req, res) => {
    const { work_type, deadline } = req.body;

    if (!work_type || !deadline) {
        return res.status(400).send('Work type and deadline are required');
    }

    const query = 'INSERT INTO work_tasks (work_type, deadline) VALUES (?, ?)';
    db.query(query, [work_type, deadline], (err, result) => {
        if (err) {
            console.error('Error adding work:', err);
            return res.status(500).send('Error adding work');
        }
        res.status(200).send('Work added successfully');
    });
});

// API to get all work tasks
app.get('/work-tasks', (req, res) => {
    const query = 'SELECT * FROM work_tasks';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching work tasks:', err);
            return res.status(500).send('Error fetching work tasks');
        }
        res.json(results);
    });
});

// API to update the status of a work task
app.put('/update-status/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Completed', 'Expired'].includes(status)) {
        return res.status(400).send('Invalid status');
    }

    const query = 'UPDATE work_tasks SET status = ? WHERE id = ?';
    db.query(query, [status, id], (err, result) => {
        if (err) {
            console.error('Error updating status:', err);
            return res.status(500).send('Error updating status');
        }
        res.status(200).send('Status updated successfully');
    });
});

// API to automatically expire tasks past their deadline
app.put('/expire-tasks', (req, res) => {
    const query = 'UPDATE work_tasks SET status = "Expired" WHERE deadline < NOW() AND status = "Pending"';
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error expiring tasks:', err);
            return res.status(500).send('Error expiring tasks');
        }
        res.status(200).send('Expired tasks updated successfully');
    });
});
app.listen(3000, () => {
    console.log('Server running on port 3000');
});