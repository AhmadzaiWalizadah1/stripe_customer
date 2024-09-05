const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG');
const path = require('path');
const handlebars = require('express-handlebars');
const port = 3000;
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
// Require Modules
const { retrieveAllCustomersAndSubscriptions, storeDataInDatabase,main} = require('./public/js/storeData_DB'); 
const {getAllCustomers,createCustomer,deleteCustomer} = require('./public/js/customer');
const {getAllSubscriptions,getProducts,createSubscription,cancelSubscription} = require('./public/js/subscription');

// to store data in DB
// main(); 

// Route creating a Customer
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
// Route to handle delete
app.post('/delete-customer', async (req, res) => {
    const customerId = req.body.customerId;
    const redirect = true;
    try {
            const result =  await deleteCustomer(customerId);
            if (result.success) {
                res.render('main', {
                    layout: 'index',
                    message: result.message,
                    redirect
                });
            }
             else {
               res.render('main',{
                    layout: 'index',
                    message: result.message,
                    redirect
               });
            }
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).render('main', {
            layout: 'index',
            message: result.message,
            redirect
        });
    }
});
// Route to create a subscription 
app.post('/create-subscription',csrfProtection, async (req, res) => {
        const { customerId, priceId } = req.body;
        const redirect = true;
      
        try {
            const subscriptionResponse = await createSubscription(customerId, priceId);
            if (subscriptionResponse.success) {
                res.render('main', { 
                    layout: 'index', 
                    message: subscriptionResponse.message,
                    redirect
                });
            }
            else {
                res.render('main', { 
                    layout: 'index', 
                    message: subscriptionResponse.message,
                    redirect
                });
            }

        } catch (error) {
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
        const cancellation = await cancelSubscription(subscription);
        if (cancellation.success ) {
            res.render('main',{
                layout: 'index',
                message: cancellation.message,
                redirect
            }); 
        } 
        else
         {
           res.render('main',{
            layout: 'index',
            message: cancellation.message,
            redirect
           });
        }
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.render('main', {
            layout: 'index',
            message: cancellation.message,
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
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
