// require necessary packages
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const path = require('path');
const fs = require('fs');
const handlebars = require('express-handlebars');
const hbs = require('hbs');
const PORT = process.env.PORT || 3000;


fs.readdirSync('./views/pages').forEach(file => {
    const partialName = path.basename(file, path.extname(file));
    const filePath = path.join(__dirname, 'views', 'pages', file);
    hbs.registerPartial(partialName, fs.readFileSync(filePath, 'utf-8'));
});

// Handlebars setup
app.set('view engine','handlebars');
app.engine('handlebars',handlebars.engine({
    layoutDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials/'
}));
app.use(express.static('public'));
app.set('pages','./views/pages');
app.get('/',(req,res)=>{
    res.render('main',{layout: 'index'});
});

// Boootstrap Integration
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

// Middleware
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
});
// Connect to MySQL
db.connect(err => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected...');
});

//   Customer Interactions Begin

// Create Customer Route
app.post('/create-customer', async (req, res) => {
    const { name, email } = req.body;
    try {
        const customer = await stripe.customers.create({ name, email });
        
        // Insert customer into MySQL
        db.query('INSERT INTO customers (name, email, stripe_customer_id) VALUES (?, ?, ?)', 
            [name, email, customer.id],
            (error, results) => {
                if (error) throw error;
                res.json({ customer, subscription: null });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create Subscription Route
app.post('/create-subscription/:customerId', async (req, res) => {
    const { customerId } = req.params;
    const { priceId } = req.body; // This should be the ID of the Price object in Stripe
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
        });
        // Update MySQL customer record
        db.query('UPDATE customers SET subscription_id = ?, active_abonnement = TRUE WHERE stripe_customer_id = ?', 
            [subscription.id, customerId],
            (error) => {
                if (error) throw error;
                res.json({ subscription });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Cancel Subscription Route
app.post('/cancel-subscription/:customerId', async (req, res) => {
    const { customerId } = req.params;
    
    try {
        // Retrieve the customer record from MySQL
        db.query('SELECT subscription_id FROM customers WHERE stripe_customer_id = ?', 
            [customerId],
            async (error, results) => {
                if (error) throw error;
                if (!results.length) {
                    return res.status(404).json({ error: 'Customer not found' });
                }
                const subscriptionId = results[0].subscription_id;
                // Cancel the subscription in Stripe
                await stripe.subscriptions.del(subscriptionId);
                // Update MySQL customer record
                db.query('UPDATE customers SET subscription_id = NULL, active_abonnement = FALSE WHERE stripe_customer_id = ?', 
                    [customerId],
                    (error) => {
                        if (error) throw error;
                        res.json({ success: true, message: 'Subscription canceled' });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get Customer Data Route
app.get('/customers', (req, res) => {
    db.query('SELECT * FROM customers', (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});

app.get('/', (req, res) => {
    res.render('home');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});