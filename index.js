// require necessary packages
const express = require('express');
const bodyParser = require('body-parser');
const mysql2 = require('mysql2');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG');
const app = express();
const path = require('path');
const fs = require('fs');
const handlebars = require('express-handlebars');
const hbs = require('hbs');
const PORT =  3000;

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

// DB Configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'stripe_customer'
}
const db = mysql2.createConnection(dbConfig);
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
    param.email = 'John.snow@gmail.com';
    param.name = 'John Snow';
    param.description = 'Game of Thrones series actor';

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


  async function retrieveAllCustomersAndSubscriptions() {
        try {
            const customers = await stripe.customers.list({});
            const customerData = [];
            for (const customer of customers.data) {
                // Initialize the active_abonnement variable
                let active_abonnement = 0; // Default to 0
                // Retrieve subscriptions for the customer
                const subscriptions = await stripe.subscriptions.list({ customer: customer.id });

                // If the customer has subscriptions, update active_abonnement and store them
                if (subscriptions.data.length > 0) {
                    for (const subscription of subscriptions.data) {
                        active_abonnement = 1; // Set to 1 if there's at least one subscription
                        customerData.push({
                            name: customer.name,
                            email: customer.email,
                            customer_id: customer.id,
                            subscription_id: subscription.id,
                            active_abonnement: active_abonnement
                        });
                    }
                } else {
                    // Customer has no subscriptions, still store their information
                    customerData.push({
                        name: customer.name,
                        email: customer.email,
                        customer_id: customer.id,
                        subscription_id: null, // No subscription
                        active_abonnement: active_abonnement // Remains 0
                    });
                }
            }
            return customerData;
        } catch (error) {
            console.error('Error retrieving customers and subscriptions:', error);
            throw error;
        }
    }
  async function storeDataInDatabase(customerData) {
    try {
            const sql = "INSERT INTO customers (name, email, stripe_customer_id, subscription_id,active_abonnement) VALUES ?";
            const values = customerData.map((data) => [data.name, data.email, data.customer_id, data.subscription_id,data.active_abonnement]);
            db.promise().query(sql, [values])
                .then(result => {
                    console.log('Customers added:', result);
                })
                .catch(err => {
                    console.error('Error inserting customers:', err);
                });


      console.log('Data stored successfully.');
    } catch (error) {
      console.error('Error storing data in database:', error);
      throw error;
    }
  }

  async function main() {
    try {
      const customerData = await retrieveAllCustomersAndSubscriptions();
      await storeDataInDatabase(customerData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
    }
  }

//   main();

// Create subscription
async function createSubscription(req, res)  {
        const customerId = 'cus_QjSOCTNu8UCPl3';
        const priceId = 'price_1PsJyoIC80XBakK1g6wkOWQa';

      try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [
              {
                price: priceId,
              },
            ],
          });
        // Update MySQL customer record
        db.query('UPDATE customers SET subscription_id = ?, active_abonnement = TRUE WHERE stripe_customer_id = ?',
            [subscription.id, customerId],
            (error) => {
                if (error) throw error;
            }
        );
    } catch (error) {
        console.log(error);
    }
};
// function call
//  createSubscription();


// Get all Subscriptions
async function listSubscriptions(){
        const subscriptions = await stripe.subscriptions.list({});
        console.log(subscriptions);
 }

    // listSubscriptions();


// Cancel Subscription Route
async function cancelSubscription (req, res){

    const customerId = 'cus_QjRNsDIdSlWInF' ;

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
                await stripe.subscriptions.cancel(subscriptionId);
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
}
        // function call
        // cancelSubscription();


app.get('/', (req, res) => {
    res.render('home');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
