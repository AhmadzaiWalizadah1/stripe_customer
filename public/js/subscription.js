const Stripe = require('stripe');
const stripe = Stripe('sk_test_51PqbrQIC80XBakK1ZBJIWKcchvauBdTDppLeEyUVeg40WQsSLecVtjNUtN18w9gExUeboe7sAmkSOinCZmGJyMJT00vE9tb4RG');
const mysql2 = require('mysql2');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'stripe_customer'
}
const db = mysql2.createConnection(dbConfig);

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

// Create Subscription
async function createSubscription(customerId, priceId){
   
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
            return {success: false, message: 'Customer has already a subscription of this Type.'}
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
        return {success: true,subscription:subscription, message: "THANKS for subscribing!"}
    } catch (error) {
        console.error('Error creating subscription:', error);
        let message = 'Internal server error';
        if (error.type === 'StripeError') {
            message = error.message;
        }
        return {success:false, message: 'internal error.'}
}
}

// Cancel a subscription
 async function cancelSubscription(subscription) {

try {
    // Cancel the subscription using Stripe API
    const cancellation = await stripe.subscriptions.cancel(subscription);

    if (cancellation.status === 'canceled') {
        // Update the database only if the subscription is successfully canceled
        await db.promise().query(
            'UPDATE customers SET subscription_id = NULL, active_abonnement = FALSE WHERE subscription_id = ?',
            [subscription]
        );
        return { success:true,message: 'Subscription canceled successfully!', };
    }
     else {
        throw new Error('Failed to cancel subscription on Stripe');
    }
} catch (error) {
    console.error('Error canceling subscription:', error);
    return{
        success:false,message: 'Failed to cancel subscription. Please try again.'};
}
};


module.exports = {getAllSubscriptions,getProducts,createSubscription,cancelSubscription }
