const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;
require('dotenv').config();
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// console.log('Connecting to MySQL with the following details:');
// console.log(`Host: ${process.env.MYSQLHOST}`);
// console.log(`Port: ${process.env.MYSQLPORT}`);
// console.log(`:User  ${process.env.MYSQLUSER}`);
// console.log(`Database: ${process.env.MYSQLDATABASE}`);
// MySQL Connection
    const db = mysql.createConnection({
        host: process.env.MYSQLHOST,
        port: process.env.MYSQLPORT,
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE
    });

db.connect(err => {
    if (err) {
        console.log("Db ERROR")
        throw err;}
    console.log('MySQL Connected...');
});

// Hardcoded admin credentials
const adminUser   = {
    username: 'admin',
    password: 'admin123'
};
 
app.post('/submit', (req, res) => {
    db.query(`
    CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        email VARCHAR(255) NOT NULL,
        service VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`,(error, results) => {
    if (error) throw error;
    console.log('Leads table created successfully');
});
    
    const { name, mobile, email, service, price, note } = req.body;
    const sql = 'INSERT INTO leads (name, mobile, email, service, price, note) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, mobile, email, service, price, note], (err, result) => {
        if (err) throw err;
        res.send("Data received");
    });
});

// Authentication Route
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
            <title>Login</title>
        </head>
        <body>
            <div class="container">
                <h2 class="mt-5">Login</h2>
                <form action="/login" method="POST" class="mt-3">
                    <div class="form-group">
                        <label for="username">Username:</label>
                        <input type="text" class="form-control" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === adminUser .username && password === adminUser .password) {
        req.session.authenticated = true;
        return res.redirect('/dashboard');
    } else {
        return res.send('Invalid credentials');
    }
});

// Middleware to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
}

// CRUD Routes
app.get('/dashboard', isAuthenticated, (req, res) => {
    db.query('SELECT * FROM leads', (err, results) => {
        if (err) throw err;
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <title>Dashboard</title>
            </head>
            <body>
                <div class="container">
                    <h2 class="mt-5">Lead Management Dashboard</h2>
                    <table class="table table-striped mt-3">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>Email</th>
                                <th>Service</th>
                                <th>Price</th>
                                <th>Note</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results.map(row => `
                                <tr>
                                    <td>${row.name}</td>
                                    <td>${row.mobile}</td>
                                    <td>${row.email}</td>
                                    <td>${row.service}</td>
                                    <td>₹${row.price}</td>
                                    <td>${row.note}</td>
                                    <td>
                                        <a href="/edit/${row.id}" class="btn btn-warning btn-sm">Edit</a>
                                        <a href="/delete/${row.id}" class="btn btn-danger btn-sm">Delete</a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <a href="/logout" class="btn btn-secondary">Logout</a>
                </div>
            </body>
            </html>
        `);
    });
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err;
        res.redirect('/login');
    });
});

// Edit and Delete Routes
app.get('/edit/:id', isAuthenticated, (req, res) => {
    const leadId = req.params.id;
    db.query('SELECT * FROM leads WHERE id = ?', [leadId], (err, results) => {
        if (err) throw err;
        const lead = results[0];
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <title>Edit Lead</title>
            </head>
            <body>
                <div class="container">
                    <h2 class="mt-5">Edit Lead</h2>
                    <form action="/edit/${leadId}" method="POST" class="mt-3">
                        <div class="form-group">
                            <label for="name">Customer Name:</label>
                            <input type="text" class="form-control" id="name" name="name" value="${lead.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="mobile">Mobile No:</label>
                            <input type="tel" class="form-control" id="mobile" name="mobile" value="${lead.mobile}" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email ID:</label>
                            <input type="email" class="form-control" id="email" name="email" value="${lead.email}" required>
                        </div>
                        <div class="form-group">
                            <label for="services">List of Services:</label>
                            <select id="services" name="service" class="form-control">
                                <option value="GST Filing" ${lead.service === 'GST Filing' ? 'selected' : ''}>GST Filing</option>
                                <option value="Company Registration" ${lead.service === 'Company Registration' ? 'selected' : ''}>Company Registration</option>
                                <option value="Tax Consultancy" ${lead.service === 'Tax Consultancy' ? 'selected' : ''}>Tax Consultancy</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="servicePrice">Price:</label>
                            <input type="number" class="form-control" id="servicePrice" name="price" value="${lead.price}" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="note">Note:</label>
                            <textarea id="note" name="note" class="form-control" rows="3">${lead.note}</textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Update</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    });
});

app.post('/edit/:id', isAuthenticated, (req, res) => {
    const leadId = req.params.id;
    const { name, mobile, email, service, price, note } = req.body;
    db.query('UPDATE leads SET name = ?, mobile = ?, email = ?, service = ?, price = ?, note = ? WHERE id = ?', [name, mobile, email, service, price, note, leadId], (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});

app.get('/delete/:id', isAuthenticated, (req, res) => {
    const leadId = req .params.id;
    db.query('DELETE FROM leads WHERE id = ?', [leadId], (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});