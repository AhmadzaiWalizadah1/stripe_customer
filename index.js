const mysql2 = require('mysql2');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG');
const path = require('path');
const handlebars = require('express-handlebars');
const PORT =  3000;

// CSRF Protection
const express = require('express');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const session = require('express-session'); 
const app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);
app.use((req, res, next) => {
    // Check if the token is already in locals to avoid multiple generations
    if (!res.locals.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
        console.log("Generated CSRF Token:", res.locals.csrfToken);
    }
    next();
});

// Handlebars setup
app.set('view engine','handlebars');
app.engine('handlebars',handlebars.engine({
    layoutDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials/'
}));
app.set('pages','./views/pages');

// Boootstrap Integration
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));


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

 
// Get all Customers Function
async function getAllCustomers() {
    try {
        const customers = await stripe.customers.list();
        return customers.data; // Simplified return
    } catch (err) {
        console.error('Error fetching customers:', err);
        throw err; // Re-throw the error for handling in the main route
    }
}

//Create-customer Function
async function createCustomer(name, email,description) {
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
        return { success: true, customer: newCustomer, message: 'User created successfully :)' };
    } catch (error) {
        console.error('Error creating user in Stripe:', error);
        throw error; // You might want to return some error message or structure
    }
}

// Route for creating a Customer
app.post('/create-customer',csrfProtection, async (req, res) => {
    const { name, email, description } = req.body;
    try {
       const result = await createCustomer(name, email, description);
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

// Route to handle delete (POST)
app.post('/delete-customer', async (req, res) => {
    const customerId = req.body.customerId;
    const redirect = true;
    try {
        await stripe.customers.del(customerId);
        res.render('main', {
            layout: 'index',
            message: 'Customer deleted successfully.',
            redirect
        });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).render('main', {
            layout: 'index',
            message: 'Error deleting customer.',
            redirect
        });
    }
});

// Get all Subscriptions Function
async function getAllSubscriptions() {
    try {
        // Get all subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({});
        const subscriptionData = await Promise.all(subscriptions.data.map(async (subscription) => {
            // Fetch customer details using the customer ID
            const customer = await stripe.customers.retrieve(subscription.customer);
            // Extract product information (assuming single items)
            const productId = subscription.items.data[0].price.product;
            const product = await stripe.products.retrieve(productId);
            return {
                sub_id: subscription.id,
                email: customer.email,
                status: subscription.status,
                customerName: customer.name || 'N/A',
                customerDescription: customer.description || 'N/A',
                billing: subscription.collection_method || null,
                product: product.name,
                createdAt: new Date(subscription.created * 1000).toLocaleString(), 
    

            };
        }));
        return subscriptionData; // Simplified return
    } catch (error) {
        console.error('Error fetching Subscriptions:', error);
        throw error; // Re-throw the error for handling in the main route
    }
}

// Route to render subscription form
async function getProducts()  {
    try {
        const products = await stripe.products.list();
        return products.data;
    } catch (error) {
        console.error('Error fetching customers or products:', error);

    }
}
// Route to create a subscription 
app.post('/create-subscription',csrfProtection, async (req, res) => {
        const { customerId, priceId } = req.body;
        const redirect = true;
      
        try {
            const existingSubscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                expand: ['data.items']
            });
            const hasActiveSubscription = existingSubscriptions.data.some(subscription =>
                subscription.items.data.some(item => item.price.id === priceId)
            );
            if (hasActiveSubscription) {
                console.log('Customer has already a Subscription of this Type.');
                res.render('main', { 
                    layout: 'index', 
                    message: 'Customer has already a subscription of this type.',
                    redirect
                });
                return {success: false, message: 'Customer has already a Subscription of this Type.'}
            
            }

            // Step 2: Create the subscription since no active subscription exists
            const subscription = await stripe.subscriptions.create({ customer: customerId,
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
            res.render('main', { 
                layout: 'index', 
                message: 'Thanks for subscribing...',
                csrfToken: req.csrfToken(), 
                redirect
            });
            return {success: true,subscription:subscription, message: "Thanks for subscribing. We are glad to have you...."}
        } catch (error) {
            console.error('Error creating subscription:', error);
            let message = 'Internal server error';
            if (error.type === 'StripeError') {
                message = error.message;
            }
            return {success:false, message: 'internal error.'}
}
});

// Cancel a subscription
app.post('/cancel-subscription', csrfProtection, async (req, res) => {
    const { subscription } = req.body;  
    const redirect = true;
    try {
        // Cancel the subscription using Stripe API
        const cancellation = await stripe.subscriptions.cancel(subscription);

        if (cancellation.status === 'canceled') {
            // Update the database only if the subscription is successfully canceled
            await db.promise().query(
                'UPDATE customers SET subscription_id = NULL, active_abonnement = FALSE WHERE subscription_id = ?',
                [subscription]
            );
            console.log('Subscription canceled.');

            res.render('main', {
                layout: 'index',
                message: 'Subscription canceled successfully!', 
                redirect
            });
        } else {
            throw new Error('Failed to cancel subscription on Stripe');
        }
    } catch (error) {
        console.error('Error canceling subscription:', error);

        res.render('main', {
            layout: 'index',
            message: 'Failed to cancel subscription. Please try again.',
            redirect
        });
    }
});

// Route to handle getting Customers,Subscriptions and Products
app.get('/', csrfProtection, async (req, res) => {

    try {
        const customers = await getAllCustomers();
        const subscriptions = await getAllSubscriptions();
        const products = await getProducts();
        res.render('main', {
            layout: 'index', 
            customers, 
            subscriptions,
            products,
            csrfToken: req.csrfToken() 
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error retrieving data');
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
