const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;
require('dotenv').config();

app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
// Configure storage for uploaded files
// const storage = multer.diskStorage({
//   destination: './public/uploads/',
//   filename: function(req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//   }
// });
// const upload = multer({ storage: storage });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Database connection
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected...');
  
  // Create tables if not exists
  db.query(`
    CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        father_name VARCHAR(255),
        spouse_name VARCHAR(255),
        mother_name VARCHAR(255),
        aadhar VARCHAR(20),
        pan VARCHAR(20),
        company_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        gst VARCHAR(20),
        cin VARCHAR(20),
        services JSON NOT NULL,
        note TEXT,
        is_customer BOOLEAN DEFAULT FALSE,
        documents TEXT,
        assigned_to VARCHAR(255),
        delivery_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`, (error) => {
    if (error) throw error;
    console.log('Leads table verified');
});
});

// Admin credentials
const adminUser = {
  username: 'admin',
  password: 'admin123'
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
  // res.send("Hello World!");
});

app.get('/login', (req, res) => {
  // console.log(__dirname,"hi")
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .login-box { background: white; padding: 2rem; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 300px; }
        input { width: 100%; padding: 8px; margin: 5px 0; }
        button { background: #0056b3; color: white; border: none; padding: 10px; width: 100%; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h2>Admin Login</h2>
        <form action="/login" method="POST">
          <input type="text" name="username" placeholder="Username" required>
          <input type="password" name="password" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && password === adminUser.password) {
    req.session.authenticated = true;
    res.redirect('/dashboard');
  } else {
    res.send('Invalid credentials');
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated) return res.redirect('/login');
  next();
};
const adminCSS = `
  body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
  .sidebar { width: 250px; background: #0056b3; color: white; padding: 20px; display: flex; flex-direction: column; }
  .sidebar h2 { text-align: center; margin-bottom: 20px; }
  .sidebar ul { list-style: none; }
  .sidebar ul li { padding: 10px; margin: 5px 0; background: #003d80; border-radius: 5px; cursor: pointer; text-align: center; }
  .sidebar ul li:hover { background: #ff6600; }
  .main-content { flex: 1; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .header h2 { color: #ff6600; }
  table { width: 100%; background: white; border-collapse: collapse; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
  th { background: #0056b3; color: white; }
  .logout-btn { background: #dc3545; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; position: absolute; top: 20px; right: 20px; }
  .form-container { background: white; padding: 20px; border-radius: 5px; margin: 20px; }
  .form-group { margin-bottom: 15px; }
`;

// Dashboard Route
app.get('/dashboard', requireAuth, (req, res) => {
  db.query('SELECT * FROM leads WHERE is_customer = FALSE', (err, leads) => {
    if (err) throw err;
    // console.log(leads[0].services)
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lead Dashboard</title>
        <style>${adminCSS}</style>
     
      </head>
      <body>
        <div class="sidebar">
          <h2>Lead Details</h2>
          <ul>
          <li onclick="location.href='/dashboard'" style="background: #ff6600;">Dashboard</li>
          <li onclick="location.href='/new-leads'">New Leads</li>
          <li onclick="location.href='/customers'" >Customer</li>
          <li onclick="location.href='/add-services'">Add Services</li>
       
          </ul>
        </div>
        <div class="main-content">
          <div class="header">
            <h2>Lead Management</h2>
            <a href="/logout" class="logout-btn">Logout</a>
          </div>
          <table>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Task</th>
              <th>Total Price</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
            ${leads.map(lead => `
              <tr>
                <td>${lead.customer_name}</td>
                <td>${lead.mobile}</td>
                <td>${lead.email}</td>
                <td>${lead.services.map(ser => ser.name).join(', ')}</td>
                <td>₹${lead.services.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue.price), 0).toFixed(2)}</td>
                <td>${lead.note}</td>
                <td class="action-buttons">
                  <button class="edit-btn" onclick="location.href='/edit/${lead.id}'">Edit</button>
                  <button class="delete-btn" onclick="if(confirm('Are you sure?')) location.href='/delete/${lead.id}'">Delete</button>
                  <button class="customer-btn" onclick="location.href='/convert-customer/${lead.id}'">Make Customer</button>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
      </body>
      </html>
    `);
  });
});

app.post('/submit', (req, res) => {
    const { customer, services } = req.body;
    console.log(req.body)
    // Validate required fields
    if (!customer.customerName || !customer.mobile || !customer.email) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const leadData = {
        customer_name: customer.customerName,
        mobile: customer.mobile,
        father_name: customer.fatherName,
        spouse_name: customer.spouseName,
        mother_name: customer.motherName,
        aadhar: customer.aadhar,
        pan: customer.pan,
        company_name: customer.company,
        email: customer.email,
        gst: customer.gst,
        cin: customer.cin,
        services: JSON.stringify(services),
        note: customer.note
    };

    db.query(
        `INSERT INTO leads SET ?`,
        leadData,
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Error saving lead' });
            }
            res.status(200).json({ 
                message: 'Lead submitted successfully!',
                leadId: result.insertId
            });
        }
    );
});

// Customer Conversion Routes
app.get('/convert-customer/:id', requireAuth, (req, res) => {
    db.query('SELECT * FROM leads WHERE id = ?', [req.params.id], (err, result) => {
      if (err) throw err;
      const lead = result[0];
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convert to Customer</title>
          <style>${adminCSS}</style>
     
        </head>
        <body>
        <div class="container">
        <h2>TAXMIS Customer Conversion</h2>
        <form id="conversionForm">
            <label for="documentName">Document Name:</label>
            <input type="text" id="documentName" name="documentName" required>
            <br>
            <label for="documents">Upload Documents:</label>
            <input type="file" id="documents" name="documents" accept="image/*" required>
            <br>
            <label for="employee">Assigned Employee:</label>
            <select id="employee" name="employee" required>
                <option value="Nisha">Nisha</option>
                <option value="Arnab">Arnab</option>
                <option value="Ramesh">Ramesh</option>
            </select>
            <br>
            <label for="deliveryDate">Date of Delivery:</label>
            <input type="date" id="deliveryDate" name="deliveryDate" required>
            <br>
            <button type="submit">Convert to Customer</button>
        </form>
    </div>

    <script>
    const leadId = ${req.params.id};
        document.getElementById('conversionForm').addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent the default form submission

            const documentName = document.getElementById('documentName').value;
            const fileInput = document.getElementById('documents');
            const employee = document.getElementById('employee').value;
            const deliveryDate = document.getElementById('deliveryDate').value;

            // Convert the file to Base64
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onloadend = async function() {
                const base64String = reader.result.split(',')[1]; // Get the Base64 string

                // Send the Base64 string to the server
                const response = await fetch(\`/convert-customer/\${leadId}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        documentName: documentName,
                        employee: employee,
                        deliveryDate: deliveryDate,
                        document: base64String // Send the Base64 string
                    }),
                });

                if (response.ok) {
                    window.location.href = '/dashboard'; // Redirect on success
                } else {
                    alert('Error converting to customer');
                }
            };
            reader.readAsDataURL(file); // Read the file as a data URL
        });
    </script>
        </body>
        </html>
      `);
    });
  });
  
  app.post('/convert-customer/:id', (req, res) => {
    const { documentName, employee, deliveryDate, document } = req.body;

    const updateData = {
        is_customer: true,
        assigned_to: employee,
        delivery_date: deliveryDate,
        documents: JSON.stringify([{ name: documentName, path: `data:image/png;base64,${document}` }]) // Store as Base64
    };

    db.query('UPDATE leads SET ? WHERE id = ?', [updateData, req.params.id], (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});
  
  // Customers List Route
  app.get('/customers', requireAuth, (req, res) => {
    db.query('SELECT * FROM leads WHERE is_customer = TRUE', (err, customers) => {
      if (err) throw err;
      console.log(customers)
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Customers</title>
          <style>
          ${adminCSS}
          </style>
        </head>
        <body>
          <div class="sidebar">
            <h2>Lead Details</h2>
            <ul>
              <li onclick="location.href='/dashboard'">Dashboard</li>
              <li onclick="location.href='/new-leads'">New Leads</li>
              <li onclick="location.href='/customers'" style="background: #ff6600;">Customer</li>
              <li onclick="location.href='/add-services'">Add Services</li>
            </ul>
          </div>
          <div class="main-content">
            <div class="header">
              <h2>Customer Management</h2>
              <a href="/logout" class="logout-btn">Logout</a>
            </div>
            <table>
              <tr>
                <th>Name</th>
                <th>Assigned To</th>
                <th>Delivery Date</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
              ${customers.map(customer => `
                <tr>
                  <td>${customer.customer_name}</td>
                  <td>${customer.assigned_to}</td>
                  <td>${new Date(customer.delivery_date).toLocaleDateString()}</td>
                  <td>
        <a href="https://crudeapplication.vercel.app/${customer.id}" target="_blank">
            ${JSON.parse(customer.documents).length} documents
        </a>
    </td>
                   <td class="action-buttons">
                    <button class="edit-btn" onclick="location.href='/edit/${customer.id}'">Edit</button>
                    <button class="delete-btn" onclick="if(confirm('Are you sure?')) location.href='/delete/${customer.id}'">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
        </body>
        </html>
      `);
    });
  });
  app.get('/documents/:customerId', (req, res) => {
    const customerId = req.params.customerId;

    db.query('SELECT documents FROM leads WHERE id = ?', [customerId], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const documents = JSON.parse(results[0].documents);
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Documents</title>
                </head>
                <body>
                    <h2>Documents for Customer ID: ${customerId}</h2>
                    <ul>
                        ${documents.map(doc => `
                            <li>
                                <img src="${doc.path}" ></a>
                            </li>
                        `).join('')}
                    </ul>
                    <button onclick="location.href='/customers'">Back to Customers</button>
                </body>
                </html>
            `);
        } else {
            res.send('No documents found for this customer.');
        }
    });
});
  
  // Logout Route
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
  });


// GET Edit Form (Complete Version)
app.get('/edit/:id',requireAuth, (req, res) => {
  db.query('SELECT * FROM leads WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Error retrieving lead');
    }
    
    const lead = result[0];
    console.log(lead)
    const services = lead.services;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit Lead - TAXMIS</title>
        <style>
          ${adminCSS}
          /* Include all styles from camis.html */
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: separate; border-spacing: 15px; }
          td { padding: 10px; vertical-align: top; }
          label { font-weight: bold; font-size: 14px; display: block; margin-bottom: 5px; }
          input, select, button, textarea { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 5px; }
          button { background-color: #0056b3; color: white; cursor: pointer; }
          .service-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
          .service-item { background-color: #ff6600; color: white; padding: 5px 10px; border-radius: 5px; }
          .close-btn { background: none; border: none; color: white; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Edit Lead</h2>
          <form id="editForm">
            <table>
              <tr>
                <td><label for="name">Customer Name:</label><input type="text" id="name" value="${lead.customer_name}" required></td>
                <td><label for="mobile">Mobile No:</label><input type="tel" id="mobile" value="${lead.mobile}" required></td>
              </tr>
              <tr>
                <td><label for="father">Father's Name:</label><input type="text" id="father" value="${lead.father_name || ''}"></td>
                <td><label for="spouse">Spouse Name:</label><input type="text" id="spouse" value="${lead.spouse_name || ''}"></td>
              </tr>
              <tr>
                <td><label for="mother">Mother's Name:</label><input type="text" id="mother" value="${lead.mother_name || ''}"></td>
                <td><label for="adhar">Aadhar Card No:</label><input type="text" id="adhar" value="${lead.aadhar || ''}"></td>
              </tr>
              <tr>
                <td><label for="pan">PAN No:</label><input type="text" id="pan" value="${lead.pan || ''}"></td>
                <td><label for="company">Company Name:</label><input type="text" id="company" value="${lead.company_name || ''}"></td>
              </tr>
              <tr>
                <td><label for="email">Email ID:</label><input type="email" id="email" value="${lead.email}" required></td>
                <td><label for="gst">GST No:</label><input type="text" id="gst" value="${lead.gst || ''}"></td>
              </tr>
              <tr>
                <td><label for="cin">CIN No:</label><input type="text" id="cin" value="${lead.cin || ''}"></td>
                <td>
                  <label for="services">Add Services:</label>
                  <select id="services">
                    <option value="GST Filing">GST Filing</option>
                    <option value="Company Registration">Company Registration</option>
                    <option value="Tax Consultancy">Tax Consultancy</option>
                  </select>
                  <input type="number" id="servicePrice" placeholder="Enter price" min="0">
                  <button type="button" onclick="addService()">Add Service</button>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <label>Current Services:</label>
                  <div class="service-buttons" id="serviceButtons">
                    ${services.map(service => `
                      <div class="service-item">
                        ${service.name} - ₹${service.price}
                        <button class="close-btn" onclick="removeService(this)">×</button>
                      </div>
                    `).join('')}
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <label for="note">Note:</label>
                  <textarea id="note" rows="3">${lead.note || ''}</textarea>
                </td>
              </tr>
            </table>
            <button type="submit">Update Lead</button>
          </form>
        </div>

        <script>
          function addService() {
            const serviceSelect = document.getElementById('services');
            const priceInput = document.getElementById('servicePrice');
            const serviceButtons = document.getElementById('serviceButtons');

            if (serviceSelect.value && priceInput.value) {
              const serviceItem = document.createElement('div');
              serviceItem.className = 'service-item';
              serviceItem.innerHTML = \`
                \${serviceSelect.value} - ₹\${priceInput.value}
                <button class="close-btn" onclick="removeService(this)">×</button>
              \`;
              serviceButtons.appendChild(serviceItem);
              priceInput.value = '';
            }
          }

          function removeService(closeButton) {
            closeButton.parentElement.remove();
          }

          document.getElementById('editForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const services = Array.from(document.querySelectorAll('.service-item')).map(item => {
              const text = item.childNodes[0].textContent.trim();
              const [name, price] = text.split(' - ₹');
              return { name, price: parseFloat(price) };
            });

            const formData = {
              customer_name: document.getElementById('name').value,
              mobile: document.getElementById('mobile').value,
              father_name: document.getElementById('father').value,
              spouse_name: document.getElementById('spouse').value,
              mother_name: document.getElementById('mother').value,
              aadhar: document.getElementById('adhar').value,
              pan: document.getElementById('pan').value,
              company_name: document.getElementById('company').value,
              email: document.getElementById('email').value,
              gst: document.getElementById('gst').value,
              cin: document.getElementById('cin').value,
              note: document.getElementById('note').value,
              services: JSON.stringify(services)
            };

            try {
              const response = await fetch('/edit/${lead.id}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
              });

              if (response.ok) {
                window.location.href = '/dashboard';
              } else {
                alert('Error updating lead');
              }
            } catch (error) {
              console.error('Error:', error);
              alert('Failed to update lead');
            }
          });
        </script>
      </body>
      </html>
    `);
  });
});

// POST Edit Route (Complete Version)
app.post('/edit/:id', requireAuth, (req, res) => {
  const updateData = {
    customer_name: req.body.customer_name,
    mobile: req.body.mobile,
    father_name: req.body.father_name,
    spouse_name: req.body.spouse_name,
    mother_name: req.body.mother_name,
    aadhar: req.body.aadhar,
    pan: req.body.pan,
    company_name: req.body.company_name,
    email: req.body.email,
    gst: req.body.gst,
    cin: req.body.cin,
    note: req.body.note,
    services: req.body.services
  };

  db.query('UPDATE leads SET ? WHERE id = ?', [updateData, req.params.id], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to update lead' });
    }
    res.status(200).json({ message: 'Lead updated successfully' });
  });
});
  // Delete Route
  app.get('/delete/:id', requireAuth, (req, res) => {
    db.query('DELETE FROM leads WHERE id = ?', [req.params.id], (err) => {
      if (err) throw err;
      res.redirect('back');
    });
  });
  
  // New Leads Route
  app.get('/new-leads', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

  });
  
  
  // Add Services Route (Basic Implementation)
  app.get('/add-services', requireAuth, (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Add Services</title>
        <style>${adminCSS}</style>
     
      </head>
      <body>
        <div class="sidebar">
          <h2>Lead Details</h2>
          <ul>
            <li onclick="location.href='/dashboard'">Dashboard</li>
            <li onclick="location.href='/new-leads'">New Leads</li>
            <li onclick="location.href='/customers'">Customer</li>
            <li onclick="location.href='/add-services'" style="background: #ff6600;">Add Services</li>
          </ul>
        </div>
        <div class="main-content">
          <div class="header">
            <h2>Service Management</h2>
            <a href="/logout" class="logout-btn">Logout</a>
          </div>
          <div class="form-container">
            <h3>Service Management Coming Soon</h3>
          </div>
        </div>
      </body>
      </html>
    `);
  });
  
  // Start Server
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
