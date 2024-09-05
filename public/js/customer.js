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
// Delete customer
async function deleteCustomer(customerId) {
    try {
        const deletedCustomer = await stripe.customers.del(customerId);

        if (deletedCustomer.deleted) {
            return {
                success: true,
                message: 'Customer deleted successfully.',
            };
        } else {
            return {
                success: false,
                message: 'Customer deletion failed.',
            };
        }
    } catch (error) {
        console.error('Error deleting customer:', error);
        return {
            success: false,
            message: 'Error deleting customer.',
        };
    }
}
module.exports = {getAllCustomers, createCustomer, deleteCustomer}

