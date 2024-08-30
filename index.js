// require necessary packages
const express = require('express');
const mysql2 = require('mysql2');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG');
const app = express();
const path = require('path');
const fs = require('fs');
const handlebars = require('express-handlebars');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csurf = require('csurf');
const PORT =  3000;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); 
app.use(csurf({ cookie: true })); 
// Middleware to expose the CSRF token to views
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});
// Handlebars setup
app.set('view engine','handlebars');
app.engine('handlebars',handlebars.engine({
    layoutDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials/'
}));

app.use(express.static('public'));
app.set('pages','./views/pages');

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
async function createSubscription(req, res) {
    const customerId = 'cus_QjSOCTNu8UCPl3'; // The customer ID can be retrieved from req.body or req.params
    const priceId = 'price_1PsJyoIC80XBakK1g6wkOWQa'; // The price ID can also be passed in as a parameter
    try {
        // Step 1: Check if the customer already has an active subscription with this price ID
        const existingSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active', // Check for active subscriptions only
            expand: ['data.items']
        });
        const hasActiveSubscription = existingSubscriptions.data.some(subscription =>
            subscription.items.data.some(item => item.price.id === priceId)
        );
        if (hasActiveSubscription) {
            console.log('Customer has already a Subscription of this Type.');
            return {success: false, message: 'Customer has already a Subscription of this Type.'}
        }
        // Step 2: Create the subscription since no active subscription exists
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
                if (error) 
                    console.log('error updating customer ',error);
            }
        );
        // Respond with the subscription details
        console.log("Thanks for subscribing. We are glad to have you....");
        return {success: true,subscription:subscription, message: "Thanks for subscribing. We are glad to have you...."}
    } catch (error) {
        console.error('Error creating subscription:', error);
        let message = 'Internal server error';
        if (error.type === 'StripeError') {
            message = error.message;
        }
        return {success:false, message: 'internal error.'}
    }
}
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

    const customerId = 'cus_QjSOCTNu8UCPl3' ;

    try {
        // Retrieve the customer record from MySQL
        db.query('SELECT subscription_id FROM customers WHERE stripe_customer_id = ?',[customerId],async (error, results) => {
                if (error){
                    reject (error);
                    resolve(results[0].subscription_exposed_id); 
                }
                const subscriptionId = results[0].subscription_id;    
                
                if (!subscriptionId) {
                    console.log('There is no such a Subscription.');
                    return { success: false, message:'There is no such a Subscription.' };
                }
                // Cancel the subscription in Stripe
                await stripe.subscriptions.cancel(subscriptionId);
                // Update MySQL customer record
                db.query('UPDATE customers SET subscription_id = NULL, active_abonnement = FALSE WHERE stripe_customer_id = ?',[customerId],(error) => {
                        if (error) throw error;
                        console.log('subscription canceled.');
                        return { success: true, message: 'Subscription canceled' };
                    }
                );
            }
        );
    } catch (error) {
        console.log(error)
        return { error: error.message };
    }
}
        // function call
        // cancelSubscription();

        //  ROUTES ARE DEFINED HERE... 

 // all users
app.get('/', async (req, res) => {
    try {
        // Fetch customers from Stripe
        const customers = await stripe.customers.list();
        
        // Render the view and pass the customers data
        res.render('main', { layout: 'index', customers: customers.data });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).send('Error retrieving customers'); // Send an error response
    }
});



// Create a customer
async function createUser(name, email,description) {
    try {
        // Step 1: Check if the customer already exists in Stripe
        const customers = await stripe.customers.list({
            email: email,
            limit: 1 // We only need to check for one existing customer
        });
        if (customers.data.length > 0) {
            // Customer exists
            return { success: false, message: 'User already exists' };
        }
        // Step 2: Create a new customer if not found
        const newCustomer = await stripe.customers.create({
            name: name,
            email: email,
            description: description
        });
        return { success: true, customer: newCustomer, message: 'User created successfully :(' };
    } catch (error) {
        console.error('Error creating user in Stripe:', error);
        throw error; // You might want to return some error message or structure
    }
}

// create-user route 
app.post('/create-customer', async (req, res) => {
    const { name, email, description } = req.body;
    try {
       const result = await createUser(name, email, description);
       const redirect = true;
     // If customer creation is successful
       res.render('main', { 
        layout: 'index', 
        success: result.success, 
        message: result.message,
        redirect
    });
    } catch (error) {
      console.error('Error creating customer:', error);
      // Send an appropriate error message to the user
      const redirect = true;
      res.render('main', { layout: 'index', success: false, message: 'Error creating customer. Please try again later.',redirect });
    }
  });



















// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
