/**
 * SendGrid Email Service Configuration
 * Handles all email notifications using SendGrid API
 */

const sgMail = require('@sendgrid/mail');

// Validate required environment variables
if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️  SENDGRID_API_KEY not found. Email functionality will be disabled.');
} else {
    // Set SendGrid API Key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid configured successfully');
}

/**
 * Send email using SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
const sendEmail = async ({ to, subject, text, html }) => {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            console.warn('⚠️  SendGrid not configured. Email not sent.');
            return { success: false, message: 'Email service not configured' };
        }

        const msg = {
            to: to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'noreply@quickbite.com',
                name: process.env.SENDGRID_FROM_NAME || 'QuickBite'
            },
            subject: subject,
            text: text,
            html: html || text
        };

        const response = await sgMail.send(msg);
        console.log(`✅ Email sent successfully to ${to}`);
        return { success: true, response };

    } catch (error) {
        console.error('❌ SendGrid Error:', error.message);

        if (error.response) {
            console.error('SendGrid Response Error:', error.response.body);
        }

        return { success: false, error: error.message };
    }
};

/**
 * Send welcome email to new users
 */
const sendWelcomeEmail = async (userEmail, userName) => {
    const subject = 'Welcome to QuickBite! 🍕';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ec4899 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍕 Welcome to QuickBite!</h1>
            </div>
            <div class="content">
                <h2>Hi ${userName}! 👋</h2>
                <p>Thank you for joining QuickBite! We're excited to have you on board.</p>

                <p><strong>Your account has been successfully created with:</strong></p>
                <p>📧 Email: <strong>${userEmail}</strong></p>

                <p>You can now:</p>
                <ul>
                    <li>🍔 Browse our delicious menu</li>
                    <li>🛒 Place orders with ease</li>
                    <li>🚚 Track your deliveries in real-time</li>
                    <li>⭐ Rate and review your favorite dishes</li>
                </ul>

                <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/home" class="button">
                        Start Ordering Now →
                    </a>
                </center>

                <p>If you have any questions, feel free to contact our support team.</p>

                <p>Happy ordering! 🎉</p>
                <p><strong>The QuickBite Team</strong></p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} QuickBite. All rights reserved.</p>
                <p>You received this email because you created an account on QuickBite.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    Welcome to QuickBite, ${userName}!

    Your account has been successfully created with email: ${userEmail}

    You can now browse our menu and place orders at ${process.env.FRONTEND_URL || 'http://localhost:5173'}/home

    Thank you for joining us!

    - The QuickBite Team
    `;

    return await sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (userEmail, userName, orderDetails) => {
    const subject = 'Order Confirmed! 🎉';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Order Confirmed!</h1>
            </div>
            <div class="content">
                <h2>Hi ${userName}! 👋</h2>
                <p>Thank you for your order! We're preparing your food with love. 🍳</p>

                <div class="order-box">
                    <h3>Order Details:</h3>
                    <p><strong>Order ID:</strong> ${orderDetails.orderId || 'N/A'}</p>
                    <p><strong>Status:</strong> ${orderDetails.status || 'Pending'}</p>
                    <p><strong>Total Amount:</strong> $${orderDetails.totalAmount || '0.00'}</p>
                </div>

                <p>We'll notify you once your order is ready for delivery!</p>

                <p>Thank you for choosing QuickBite! 🎉</p>
                <p><strong>The QuickBite Team</strong></p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} QuickBite. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
    Order Confirmed!

    Hi ${userName},

    Thank you for your order!
    Order ID: ${orderDetails.orderId || 'N/A'}
    Status: ${orderDetails.status || 'Pending'}
    Total: $${orderDetails.totalAmount || '0.00'}

    We'll notify you once your order is ready!

    - The QuickBite Team
    `;

    return await sendEmail({ to: userEmail, subject, text, html });
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendOrderConfirmationEmail,
    sgMail
};
