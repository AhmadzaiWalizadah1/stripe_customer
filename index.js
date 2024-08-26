// require necessary packages
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG');
const app = express();
const path = require('path');
const fs = require('fs');
const handlebars = require('express-handlebars');
const hbs = require('hbs');
const { log } = require('console');
const PORT = process.env.PORT || 3000;

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
    host: "localhost",
    user: "root",
    password: "",
    database: "stripe_customer",
});
// Connect to MySQL
db.connect(err => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected...');
});
// Retrieve all customers from stripe and display it to the console.
var listCustomers  = function(err, customers){
    stripe.customers.list(function(err,customers){
        if(err){
            console.log(err)
        }
        else {
           var persons = console.log(JSON.stringify(customers,null,2)); 

        }           
    });
}
// Function call 
//   listCustomers();

// Create a customer in stripe
var createCustomer = function(){
    var param = {};
    param.email = 'Well.max@gmail.com';
    param.name = 'Max Well';
    param.description = 'The Supervisor';

    stripe.customers.create(param, (err,customer)=>{
        if(err)
            console.log(err)
        else if(customer)
            console.log('Customer created successfully.');
        else 
        console.log('something went wrong...');
    });
}
    // Function call 
    // createCustomer();


// Function to retrieve all customers from Stripe and store them in MySQL
const pool = mysql.createPool(db);
async function storeData() {

      const customers = await stripe.customers.list();

      customers.data.forEach(customer =>{
        const customerData = {
            name: customer.name,
            email:customer.email, 
            stripe_customer_id: customer.id,
            //subscription_id: customer.subscriptions.data.length > 0 ? customer.subscriptions.data[0].id : null
        }
    
        const query = `INSERT INTO customers (name, email, stripe_customer_id) VALUES (?, ?, ?)`;
         db.execute(query, [customerData.name, customerData.email, customerData.stripe_customer_id], (error, results) => {
           if (error) {
             console.error('Error inserting customer data into MySQL:', error);
           } else {
             console.log(`Inserted customer with ID: ${results.insertId}`);
           }
         });

 
     });
 }
   // storeData();




async function createSubscription(req, res)  {
    const { customerId } = req.params;
    const { priceId } = req.body; // This should be the ID of the Price object in Stripe
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
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
};

// function call 
// createSubscription();









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