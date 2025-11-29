# 🚀 QuickBite - Setup & Deployment Guide

Complete guide for installing, configuring, and deploying the QuickBite application.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** version 16.0.0 or higher ([Download](https://nodejs.org/))
- **npm** version 8.0.0 or higher (comes with Node.js)
- **MongoDB** - Either:
  - Local MongoDB ([Download](https://www.mongodb.com/try/download/community))
  - MongoDB Atlas account ([Sign up free](https://www.mongodb.com/cloud/atlas/register))
- **SendGrid Account** (optional but recommended) ([Sign up free](https://signup.sendgrid.com/))
- **Git** for cloning the repository

## 🔧 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/QuickBite.git
cd QuickBite
```

### Step 2: Backend Setup

#### 2.1 Install Backend Dependencies

```bash
cd Backend
npm install
```

#### 2.2 Configure Backend Environment Variables

Create a `.env` file in the `Backend` directory by copying the example:

```bash
cp .env.example .env
```

Edit `Backend/.env` and configure the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# MongoDB Configuration
# Option 1: Local MongoDB
MONGO_URI=mongodb://localhost:27017/quickbite

# Option 2: MongoDB Atlas (recommended for production)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quickbite

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# SendGrid Email Configuration (optional for development)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=QuickBite

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

**Important Notes:**
- **JWT_SECRET**: Generate a secure random string using:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- **SENDGRID_API_KEY**: See [SendGrid Setup](#sendgrid-email-setup) section below
- **MONGO_URI**: For MongoDB Atlas, replace username, password, and cluster name

#### 2.3 Start Backend Server

```bash
npm run dev
```

Backend will run on **http://localhost:3000**

You should see:
```
✅ MongoDB Connected Successfully
🚀 Server is running on port 3000
✅ SendGrid configured successfully (or warning if not configured)
```

### Step 3: Frontend Setup

Open a new terminal window:

#### 3.1 Install Frontend Dependencies

```bash
cd Frontend
npm install
```

#### 3.2 Configure Frontend Environment Variables

Create a `.env` file in the `Frontend` directory:

```bash
cp .env.example .env
```

Edit `Frontend/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000
```

**Note:** Vite requires all environment variables to be prefixed with `VITE_`

#### 3.3 Start Frontend Development Server

```bash
npm run dev
```

Frontend will run on **http://localhost:5173**

### Step 4: Database Seeding

The database needs to be seeded with:
- 1 admin user (email: admin@gmail.com, password: Admin1234)
- 30 food items from `Backend/food.json`

#### Seed the Database

In the Backend directory:

```bash
npm run seed
```

You should see:
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🗑️  Clearing existing data...
   ✓ Users cleared
   ✓ Orders cleared
   ✓ Food items cleared
✅ All data cleared

👨‍💼 Creating admin user...
✅ Admin user created
   📧 Email: admin@gmail.com
   🔑 Password: Admin1234
   👤 Role: admin

🍕 Seeding food items...
✅ 30 food items seeded

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Database seeded successfully!
```

## 📧 SendGrid Email Setup

SendGrid is used for sending welcome emails and order confirmations.

### Step 1: Create SendGrid Account

1. Go to [SendGrid Sign Up](https://signup.sendgrid.com/)
2. Create a free account (100 emails/day forever)
3. Complete email verification

### Step 2: Get API Key

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `QuickBite-Production`
5. Select **Full Access** (or minimum **Mail Send** access)
6. Click **Create & View**
7. **Copy the API key** (starts with `SG.`)

### Step 3: Verify Sender Email

**Important:** SendGrid requires sender email verification.

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Name:** QuickBite
   - **From Email Address:** Use a real email you own
   - **Reply To:** Same as from email
4. Click **Create**
5. **Check your email** and click the verification link

### Step 4: Update Backend .env

Add the SendGrid configuration to `Backend/.env`:

```env
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=QuickBite
```

### Step 5: Test Email Functionality

1. Restart the backend server
2. Register a new user with a real email
3. Check your inbox for the welcome email (check spam folder if not found)

### Email Features

- **Welcome Email**: Sent when users register
- **Order Confirmation**: Sent when orders are placed
- **Non-blocking**: Emails are sent asynchronously, not affecting API response time

## 🎯 Running the Application

### Development Mode

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm run dev
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

### Default Credentials

**Admin Account:**
- Email: `admin@gmail.com`
- Password: `Admin1234`
- Role: admin (can access Admin Dashboard)

**Test User:** Register your own account

## 🐛 Troubleshooting

### Backend Won't Start

**Problem:** MongoDB connection error
```
❌ MongoDB Connection Error: connect ECONNREFUSED
```

**Solutions:**
1. Check if MongoDB is running:
   ```bash
   # For local MongoDB (Windows)
   net start MongoDB

   # For local MongoDB (Mac/Linux)
   sudo systemctl start mongod
   ```
2. Verify `MONGO_URI` in `Backend/.env`
3. For MongoDB Atlas, check:
   - Cluster is active
   - IP whitelist includes your IP (or use 0.0.0.0/0 for development)
   - Username and password are correct

**Problem:** Port 3000 already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in Backend/.env
PORT=3001
```

### Frontend Won't Start

**Problem:** `VITE_API_URL` not set

**Solution:** Ensure `Frontend/.env` exists with:
```env
VITE_API_URL=http://localhost:3000
```

**Problem:** Backend not responding

**Solutions:**
1. Verify backend is running on port 3000
2. Check browser console for CORS errors
3. Ensure `FRONTEND_URL` in Backend/.env matches frontend URL

### Emails Not Sending

**Problem:** SendGrid not configured
```
⚠️ SENDGRID_API_KEY not found. Email functionality will be disabled.
```

**Solution:** Add SendGrid API key to `Backend/.env` (or skip if not needed for development)

**Problem:** Sender email not verified
```
❌ The from address does not match a verified Sender Identity
```

**Solution:** Verify your sender email in SendGrid dashboard

### Database Seeding Fails

**Problem:** Recipes already exist
```
Error: E11000 duplicate key error
```

**Solution:** The seed script automatically clears all data first. If you get this error, manually clear the database:
```bash
# In MongoDB shell
use quickbite
db.recipes.deleteMany({})
db.users.deleteMany({})
db.orders.deleteMany({})
```

## 🏭 Production Deployment

### Option 1: Traditional Server with PM2 (Recommended for Full-Stack)

#### Prerequisites
- Linux server (Ubuntu, CentOS, etc.)
- Node.js installed
- MongoDB (local or Atlas)
- Nginx for reverse proxy

#### Step 1: Install PM2

```bash
npm install -g pm2
```

#### Step 2: Update Environment Variables

Edit `Backend/.env` for production:
```env
NODE_ENV=production
MONGO_URI=your_production_mongodb_uri
FRONTEND_URL=https://yourdomain.com
SENDGRID_API_KEY=your_sendgrid_key
JWT_SECRET=your_secure_jwt_secret
```

#### Step 3: Build Frontend

```bash
cd Frontend
npm run build
```

This creates a `Frontend/dist` folder with optimized static files.

#### Step 4: Start with PM2

From the project root:
```bash
pm2 start ecosystem.config.js --env production
```

#### Step 5: PM2 Management

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart all

# Stop application
pm2 stop all

# Monitor
pm2 monit

# Save PM2 process list (auto-start on reboot)
pm2 save
pm2 startup
```

#### Step 6: Nginx Configuration

Create `/etc/nginx/sites-available/quickbite`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend - Serve static files
    location / {
        root /path/to/QuickBite/Frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API - Proxy to Express
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /fooditems {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /success {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/quickbite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 7: SSL Certificate (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option 2: Vercel Deployment (Frontend Only)

Vercel is great for deploying the **frontend**, but you'll need a separate hosting solution for the **backend** (like Render, Railway, or DigitalOcean).

#### Why Separate Hosting?

- Vercel specializes in static sites and serverless functions
- QuickBite backend is a full Express.js server with WebSocket potential
- Better performance with dedicated backend hosting

#### Recommended Deployment Strategy

**Frontend:** Vercel
**Backend:** Render, Railway, Heroku, or DigitalOcean
**Database:** MongoDB Atlas

#### Deploy Frontend to Vercel

##### Step 1: Prepare Frontend

Update `Frontend/.env` for production:
```env
VITE_API_URL=https://your-backend-url.com
```

##### Step 2: Push to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

##### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project**
3. Import your QuickBite repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `Frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. Add Environment Variables:
   - Click **Environment Variables**
   - Add: `VITE_API_URL` = `https://your-backend-url.com`

6. Click **Deploy**

##### Step 4: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain
3. Update DNS records as instructed

#### Deploy Backend to Render

##### Step 1: Create Render Account

Go to [render.com](https://render.com) and sign up

##### Step 2: Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** quickbite-backend
   - **Environment:** Node
   - **Region:** Choose closest to your users
   - **Branch:** main
   - **Root Directory:** `Backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

##### Step 3: Add Environment Variables

Add all variables from `Backend/.env`:
- `NODE_ENV` = `production`
- `PORT` = `3000` (Render provides this automatically)
- `MONGO_URI` = `your_mongodb_atlas_uri`
- `JWT_SECRET` = `your_secure_secret`
- `JWT_EXPIRES_IN` = `7d`
- `SENDGRID_API_KEY` = `your_sendgrid_key`
- `SENDGRID_FROM_EMAIL` = `your_verified_email`
- `SENDGRID_FROM_NAME` = `QuickBite`
- `FRONTEND_URL` = `https://your-vercel-app.vercel.app`

##### Step 4: Deploy

Click **Create Web Service**

Render will:
1. Build your application
2. Start the server
3. Provide a URL like: `https://quickbite-backend.onrender.com`

##### Step 5: Update Frontend Environment

Go back to Vercel and update `VITE_API_URL` to your Render backend URL.

#### Deploy Backend to Railway (Alternative)

Railway is similar to Render:

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select QuickBite repository
4. Add environment variables
5. Deploy

Railway provides:
- Automatic HTTPS
- Easy database provisioning
- Great free tier

#### Alternative: Deploy Both to Same Platform

**Render** or **Railway** can host both frontend and backend:

1. Create two services:
   - Web Service for Backend (Node.js)
   - Static Site for Frontend (or Web Service with Vite)

2. Or use a single service:
   - Build frontend during backend deployment
   - Serve frontend static files from Express

### MongoDB Atlas Setup (Production Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster (512MB storage, perfect for starting)
3. Create database user with password
4. Whitelist IP addresses:
   - For Vercel/Render: Use `0.0.0.0/0` (allow all)
   - For specific server: Add server IP
5. Get connection string:
   - Click **Connect** → **Connect your application**
   - Copy the connection string
   - Replace `<password>` with your database user password
6. Use this URI in your `MONGO_URI` environment variable

## 🔒 Production Security Checklist

Before deploying to production:

- [ ] Use strong JWT_SECRET (64+ random characters)
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS for all connections
- [ ] Verify MongoDB Atlas IP whitelist
- [ ] Enable MongoDB authentication
- [ ] Set proper CORS origins (not `*`)
- [ ] Use environment-specific `.env` files
- [ ] Never commit `.env` files to git
- [ ] Enable SendGrid domain authentication for better email deliverability
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure rate limiting appropriately
- [ ] Regular security updates (`npm audit`)
- [ ] Set up automated backups for MongoDB
- [ ] Use secure cookies in production (`secure: true`)

## 📊 Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment (development/production) |
| `PORT` | Yes | 3000 | Server port |
| `MONGO_URI` | Yes | - | MongoDB connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (use long random string) |
| `JWT_EXPIRES_IN` | No | 7d | JWT token expiration |
| `SENDGRID_API_KEY` | No | - | SendGrid API key (starts with SG.) |
| `SENDGRID_FROM_EMAIL` | No | - | Verified sender email |
| `SENDGRID_FROM_NAME` | No | QuickBite | Sender name |
| `FRONTEND_URL` | Yes | - | Frontend URL for CORS |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL (must start with VITE_) |

## 🔄 Keeping .env Files Separate

**Recommendation:** Keep separate `.env` files in `Backend/` and `Frontend/` directories.

### Why Separate Files?

1. **Different Requirements:**
   - Backend: Sensitive secrets (DB, JWT, SendGrid)
   - Frontend: Only public API URL

2. **Vite Prefix Requirement:**
   - Vite requires `VITE_` prefix for frontend variables
   - Backend doesn't need this prefix

3. **Deployment:**
   - Frontend and backend often deployed separately
   - Each service needs its own environment configuration

4. **Security:**
   - Backend secrets never exposed to frontend
   - Clear separation of concerns

### Current Structure (Recommended)

```
QuickBite/
├── Backend/
│   ├── .env              # Backend secrets (not in git)
│   └── .env.example      # Backend template (in git)
├── Frontend/
│   ├── .env              # Frontend config (not in git)
│   └── .env.example      # Frontend template (in git)
└── .gitignore            # Ignores both .env files
```

## 📞 Support & Resources

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [MongoDB Docs](https://www.mongodb.com/docs/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [SendGrid Docs](https://docs.sendgrid.com/)

### Common Issues

**CORS Errors:**
- Ensure `FRONTEND_URL` in Backend/.env matches frontend URL exactly
- Check browser console for specific CORS error
- For production, update to production frontend URL

**JWT Errors:**
- Clear cookies and try logging in again
- Verify JWT_SECRET is set and consistent
- Check token expiration time

**Database Connection:**
- Verify MongoDB is running
- Check connection string format
- For Atlas, ensure IP whitelist is correct

## 🎓 Next Steps

After successful setup:

1. **Customize the Application:**
   - Update branding and colors
   - Add your own food items
   - Customize email templates in `Backend/config/sendgrid.js`

2. **Add Features:**
   - Payment gateway integration (Stripe, PayPal)
   - Real-time order tracking (Socket.IO)
   - User reviews and ratings
   - Advanced search and filters

3. **Monitor Performance:**
   - Set up error tracking (Sentry)
   - Monitor server metrics
   - Track email delivery rates
   - Analyze user behavior

4. **Scale as Needed:**
   - Upgrade MongoDB plan
   - Add Redis for caching
   - Implement CDN for static assets
   - Set up load balancing

---

**Need Help?** Check the troubleshooting section above or file an issue on GitHub.

**Ready to Deploy?** Follow the production deployment section for your chosen platform.
