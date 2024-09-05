const stripe = require('stripe')('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG'); 
const mysql2 = require('mysql2');
const PORT =  3000;
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
   const result = await db.promise().query(sql, [values]); // Use await instead of promises for cleaner syntax

    console.log('Customers added:', result);
  } catch (error) {
        if (error.errno === 1062) { 
            console.error('Data is already saved.', error.message);
        }
        else {
            console.error('Error storing data in database:', error);
            throw error;
        }
  }
}
async function main() {
  try {
    const customerData = await retrieveAllCustomersAndSubscriptions();
    await storeDataInDatabase(customerData);
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

module.exports = { retrieveAllCustomersAndSubscriptions, storeDataInDatabase, main }; 