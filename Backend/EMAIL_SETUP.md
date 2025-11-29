# Email Notification Setup Guide

## Overview

QuickBite uses **SendGrid** for sending email notifications:
- ✅ Welcome emails when users register
- ✅ Order confirmation emails when orders are placed

## Setup Instructions

### Step 1: Create a SendGrid Account

1. Go to [SendGrid Sign Up](https://signup.sendgrid.com/)
2. Create a free account (100 emails/day forever)
3. Complete email verification

### Step 2: Get Your API Key

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `QuickBite-Production` (or any name you prefer)
5. Select **Full Access** (or at minimum, **Mail Send** access)
6. Click **Create & View**
7. **Copy the API key** (you won't be able to see it again!)

### Step 3: Verify Sender Identity

**Important:** SendGrid requires you to verify your sender email address.

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Name:** QuickBite (or your company name)
   - **From Email Address:** Use a real email you own (e.g., `noreply@yourdomain.com` or your personal email)
   - **Reply To:** Same as from email
   - Fill in other required fields
4. Click **Create**
5. **Check your email** and click the verification link
6. Wait for approval (usually instant)

### Step 4: Configure Backend

1. Navigate to your Backend folder
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and update these values:
   ```env
   # SendGrid Configuration
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=QuickBite

   # Frontend URL (for email links)
   FRONTEND_URL=http://localhost:5173
   ```

### Step 5: Test Email Functionality

#### Test Welcome Email

1. Start your backend server:
   ```bash
   cd Backend
   npm run dev
   ```

2. Register a new user account (use a real email you can check)
3. Check your email inbox for the welcome email
4. If you don't see it, check your spam folder

#### Test Order Confirmation Email

1. Log in to your application
2. Place an order
3. Check your email for the order confirmation

### Step 6: Verify in Console

Check your backend console logs:

✅ **Success:**
```
✅ SendGrid configured successfully
✅ Email sent successfully to user@example.com
```

❌ **Warning (API key missing):**
```
⚠️  SENDGRID_API_KEY not found. Email functionality will be disabled.
```

❌ **Error:**
```
❌ SendGrid Error: [error message]
```

## Troubleshooting

### Emails Not Sending

1. **API Key Not Set**
   - Error: `SENDGRID_API_KEY not found`
   - Solution: Add your API key to `.env`

2. **Unauthorized Sender**
   - Error: `The from address does not match a verified Sender Identity`
   - Solution: Verify your sender email in SendGrid dashboard

3. **Invalid API Key**
   - Error: `Unauthorized`
   - Solution: Generate a new API key with proper permissions

4. **Rate Limit Exceeded**
   - Error: `Rate limit exceeded`
   - Solution: Free tier has 100 emails/day. Upgrade if needed.

### Email Goes to Spam

1. **Verify Sender Domain** (Recommended for production)
   - Go to **Settings** → **Sender Authentication**
   - Click **Authenticate Your Domain**
   - Follow DNS configuration steps
   - This improves deliverability significantly

2. **Check Email Content**
   - Avoid spam trigger words
   - Include unsubscribe link (required for bulk emails)
   - Test with [Mail Tester](https://www.mail-tester.com/)

### Testing Without SendGrid

If you want to test without setting up SendGrid:

1. The app will log warnings but continue working:
   ```
   ⚠️  SendGrid not configured. Email not sent.
   ```

2. Users can still register and place orders
3. Emails just won't be sent

## Email Templates

### Welcome Email
- **Sent when:** User registers
- **Contains:**
  - Welcome message
  - Account details
  - Link to start ordering
  - Features overview

### Order Confirmation Email
- **Sent when:** Order is placed
- **Contains:**
  - Order ID
  - Order status
  - Total amount
  - Delivery information

## SendGrid Pricing

### Free Tier (Forever)
- ✅ **100 emails/day**
- ✅ All features included
- ✅ No credit card required
- ✅ Perfect for testing and small projects

### Paid Plans (Optional)
- **Essentials:** $19.95/month for 50,000 emails
- **Pro:** $89.95/month for 100,000 emails
- Only needed for high-volume production apps

## Production Recommendations

### For Production Deployment:

1. **Domain Authentication:**
   - Authenticate your domain in SendGrid
   - Adds SPF, DKIM, and DMARC records
   - Significantly improves deliverability

2. **Use Real Domain Email:**
   - Instead of `noreply@quickbite.com`
   - Use `noreply@yourdomain.com`

3. **Enable Email Tracking:**
   - Open tracking
   - Click tracking
   - Unsubscribe management

4. **Monitor Email Activity:**
   - Check SendGrid dashboard for delivery stats
   - Monitor bounce and spam rates
   - Set up alerts

5. **Customize Email Templates:**
   - Edit templates in `Backend/config/sendgrid.js`
   - Add your logo
   - Match your brand colors
   - Add social media links

## Alternative Email Services

If you prefer alternatives to SendGrid:

### Mailgun
- Similar pricing
- 100 emails/day free
- Good API documentation

### Amazon SES
- Very cheap ($0.10 per 1,000 emails)
- Requires AWS account
- More complex setup

### Resend
- Modern API
- 100 emails/day free
- Developer-friendly

## Need Help?

- **SendGrid Docs:** https://docs.sendgrid.com/
- **SendGrid Support:** https://support.sendgrid.com/
- **QuickBite Issues:** File an issue in your GitHub repo

## Current Implementation

### Files:
- **Config:** `Backend/config/sendgrid.js`
- **Registration:** `Backend/controllers/userAuth.controller.js` (line 43)
- **Orders:** `Backend/controllers/order.controller.js` (line 33)

### Email Functions:
```javascript
// Welcome email
sendWelcomeEmail(email, name)

// Order confirmation
sendOrderConfirmationEmail(email, name, orderDetails)
```

All emails are sent **non-blocking** (asynchronous) so they don't slow down API responses.
