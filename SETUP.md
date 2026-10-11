# 🚀 QuickBite - Setup & Deployment Guide

Complete guide for local development and production deployment.

---

## 📋 Table of Contents

- [Local Development Setup](#-local-development-setup)
- [Production Deployment (Render)](#-production-deployment-render)
- [Environment Variables Reference](#-environment-variables-reference)
- [Troubleshooting](#-troubleshooting)

---

## 🖥️ Local Development Setup

### Prerequisites

- **Node.js** ≥16.0.0 ([Download](https://nodejs.org/))
- **MongoDB** - Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- **Git**

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/QuickBite.git
cd QuickBite

# 2. Setup Backend
cd Backend
npm install
cp .env.example .env
# Edit .env with your configuration (see Environment Variables below)
npm run dev       # Start backend on http://localhost:3000
# No MongoDB? Use `npm run demo` instead - in-memory database with a sample menu

# 3. Setup Frontend (new terminal)
cd Frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3000
npm run dev       # Start frontend on http://localhost:5173
```

### Logins
- **Demo mode** (`npm run demo`): `admin@gmail.com` / `Admin1234`, `counter@quickbite.com` / `Counter1234`
- **Your own empty database:** run `npm run create-admin` in `Backend` (uses `MONGO_URI` from `.env`) to create
  the owner login. Then sign in, add the menu at `/pos/menu` and cashiers at `/pos/staff`.

---

## 🌐 Production Deployment (Render)

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PROCESS FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: Setup MongoDB Atlas (Database)
   ↓
   • Create free cluster at cloud.mongodb.com
   • Create database user with password
   • Network Access → Add IP: 0.0.0.0/0 (allow all)
   • Copy connection string:
     mongodb+srv://<user>:<pass>@cluster.mongodb.net/quickbite

STEP 2: Deploy Backend to Render
   ↓
   • Go to render.com → New → Web Service
   • Connect your GitHub repository
   • Configuration:
     - Name: quickbite-backend
     - Root Directory: Backend
     - Build Command: npm install
     - Start Command: npm start
   • Add Environment Variables (see Backend ENV table below)
   • Deploy

STEP 3: Verify Backend
   ↓
   • Visit: https://your-backend.onrender.com/health
   • Should return: {"status":"ok","environment":"production"}

STEP 4: Deploy Frontend to Render
   ↓
   • Go to render.com → New → Static Site
   • Connect your GitHub repository
   • Configuration:
     - Name: quickbite-frontend
     - Root Directory: Frontend
     - Build Command: npm install && npm run build
     - Publish Directory: dist
   • Add Environment Variables (see Frontend ENV table below)
   • Redirects/Rewrites → add: Source /*  →  Destination /index.html  (Action: Rewrite)
     (required so /pos, /pos/kitchen and /receipt/... links work on refresh)
   • Deploy

STEP 5: Update CORS
   ↓
   • Go to Backend service on Render
   • Update FRONTEND_URL environment variable
   • Set to: https://your-frontend.onrender.com
   • Backend will auto-redeploy

STEP 6: First admin & menu
   ↓
   • Existing database: sign in as the admin you already have
   • Brand-new database: on your computer, put the production MONGO_URI in Backend/.env
     and run: npm run create-admin   (creates the owner login; never deletes anything)
   • Add the menu at /pos/menu (Bulk import) and cashier logins at /pos/staff

STEP 7: Test Deployment
   ↓
   • Visit your frontend URL - the landing page shows the name, hours and live menu
   • Sign in as admin → /pos: bill a dish, check Kitchen, Dashboard and /pos/display
   • Refresh on /pos/kitchen - if you see "Not Found", the rewrite rule (STEP 4) is missing

REDEPLOYING after code changes
   ↓
   • Push to main → Render auto-deploys both services (if Auto-Deploy is on)
   • Otherwise: each service → Manual Deploy → Deploy latest commit

✅ DEPLOYMENT COMPLETE
```

---

## 📊 Environment Variables Reference

### Backend Environment Variables

**For Local Development:**

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/quickbite
JWT_SECRET=generate_using_crypto_randomBytes
JWT_EXPIRES_IN=24h
SENDGRID_API_KEY=SG.your_key_here (optional)
SENDGRID_FROM_EMAIL=your@email.com (optional)
SENDGRID_FROM_NAME=QuickBite
FRONTEND_URL=http://localhost:5173
```

**For Production (Render):**

| Variable | Value for Render | Required | Notes |
|----------|------------------|----------|-------|
| `NODE_ENV` | `production` | ✅ | Auto-set by Render |
| `PORT` | `10000` | ✅ | Auto-set by Render |
| `MONGO_URI` | `mongodb+srv://...` | ✅ | From MongoDB Atlas |
| `JWT_SECRET` | Generate new | ✅ | Use crypto.randomBytes(64) |
| `JWT_EXPIRES_IN` | `24h` | ✅ | Login session length |
| `SENDGRID_API_KEY` | `SG.xxxxx` | ❌ | Optional - for emails |
| `SENDGRID_FROM_EMAIL` | `your@email.com` | ❌ | Must be verified in SendGrid |
| `SENDGRID_FROM_NAME` | `QuickBite` | ❌ | Sender name |
| `FRONTEND_URL` | `https://your-app.onrender.com` | ✅ | Your frontend URL |
| `HOTEL_NAME` | `Sri Ganesh Restaurant` | ✅ | Shown on bills, screens and the landing page |
| `HOTEL_ADDRESS` / `HOTEL_PHONE` / `HOTEL_HOURS` | your details | ✅ | Landing page + receipts |
| `HOTEL_GSTIN` | `29ABCDE1234F1Z5` | ⚠️ | Printed on GST bills (empty if not registered) |
| `GST_SCHEME` / `GST_RATE` / `PRICES_INCLUDE_GST` | `regular` / `5` / `true` | ✅ | `true` = menu price is final |
| `UPI_VPA` / `UPI_PAYEE_NAME` | business UPI ID / name | ✅ | Exact-amount UPI QR at the counter |
| `PUBLIC_RECEIPT_BASE_URL` | `https://your-app.onrender.com` | ✅ | Links in WhatsApp bills |
| `TRUST_PROXY` | `1` | ❌ | Defaults to 1 in production (correct for Render) |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TEMPLATE_NAME` | from Meta | ❌ | Automatic WhatsApp bills |

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend Environment Variables

**For Local Development:**
```env
VITE_API_URL=http://localhost:3000
```

**For Production (Render):**

| Variable | Value for Render | Required | Notes |
|----------|------------------|----------|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` | ✅ | Your backend URL |

⚠️ **Important**: Vite requires `VITE_` prefix for all environment variables.

---

## 📧 SendGrid Email Setup (Optional)

SendGrid provides free email functionality (100 emails/day).

### Quick Setup:

1. **Create Account**: [signup.sendgrid.com](https://signup.sendgrid.com/)
2. **Get API Key**: Settings → API Keys → Create API Key (Full Access)
3. **Verify Sender**: Settings → Sender Authentication → Verify Single Sender
4. **Add to .env**:
   ```env
   SENDGRID_API_KEY=SG.your_actual_key
   SENDGRID_FROM_EMAIL=your_verified_email@domain.com
   SENDGRID_FROM_NAME=QuickBite
   ```

**Email Features:**
- Welcome email on registration
- Order confirmation emails
- Beautiful HTML templates

---

## 🔒 Security Best Practices

Your application already implements:

✅ **Password Security**: bcrypt with 12 rounds
✅ **JWT Authentication**: HttpOnly cookies
✅ **Rate Limiting**: 100 req/15min (general), 5 req/15min (auth)
✅ **Input Validation**: All inputs sanitized
✅ **NoSQL Injection Protection**: mongo-sanitize enabled
✅ **CORS Protection**: Origin validation
✅ **Security Headers**: Helmet.js enabled

**Post-Deployment Checklist:**
- [ ] Strong passwords on every login (never the demo passwords) - reset from `/pos/staff`
- [ ] Set real menu prices at `/pos/menu` and add staff logins from `/pos/staff`
- [ ] Add an UptimeRobot monitor on `<backend URL>/health` (free plan - see below)
- [ ] Set up daily database backups (bills are GST records)
- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Verify MongoDB has strong password
- [ ] Set up proper CORS (not `*`)
- [ ] Run `npm audit` regularly
- [ ] Monitor failed login attempts

---

## 🐛 Troubleshooting

### Common Issues

**❌ MongoDB Connection Failed**
```
Solution:
- Check MONGO_URI format
- For Atlas: Verify IP whitelist (0.0.0.0/0 for Render)
- Check username/password are correct
```

**❌ CORS Errors**
```
Solution:
- Verify FRONTEND_URL matches exactly (no trailing slash)
- Check both services are deployed
- Clear browser cookies
```

**❌ Backend Not Starting**
```
Solution:
- Check all required env variables are set
- Verify Node.js version (≥16.0.0)
- Check Render logs for specific errors
```

**❌ Frontend Shows "Network Error"**
```
Solution:
- Verify VITE_API_URL is correct
- Check backend is running and accessible
- Test backend health endpoint directly
```

**❌ Emails Not Sending**
```
Solution:
- Verify SendGrid API key is valid
- Check sender email is verified in SendGrid
- Note: Email functionality is optional
```

**❌ Login fails / "cannot reach the database"**
```
Open <backend URL>/health in a browser. If "db" is "disconnected", "dbProblem" says why:
  • Wrong database username or password  → fix MONGO_URI on Render (Environment tab)
  • Cannot reach the database            → MongoDB Atlas → Network Access → allow 0.0.0.0/0
  • Database host not found              → check the cluster address in MONGO_URI
  • MONGO_URI is not set                 → add it on Render
The server keeps retrying by itself; once fixed it connects within a minute (no redeploy needed
for Atlas changes; Render redeploys automatically when you save environment variables).
```

**❌ Render Free Tier Slow Start**
```
Info: Free tier services spin down after 15 mins of inactivity
Solution: Already handled - .github/workflows/keep-alive.yml pings /health every 5 minutes,
          and the frontend wakes the API as soon as any page opens.
          Add an UptimeRobot HTTP monitor (5 min) on <backend URL>/health as a backup.
          For always-on with no tricks: Render Starter plan ($7/month).
```

---

## 🎯 Quick Reference

### Local Development URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### Demo Logins (`npm run demo` only)
- **Admin**: admin@gmail.com / Admin1234
- **Counter staff**: counter@quickbite.com / Counter1234

### Important Commands

```bash
# Backend
npm run dev          # Development mode with auto-reload
npm start            # Production mode
npm run demo         # In-memory database with sample data (no MongoDB needed)
npm test             # API tests
npm run create-admin # Create the owner (admin) login

# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

---

## 📚 Additional Resources

- **MongoDB Atlas**: [docs.mongodb.com](https://docs.mongodb.com)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **SendGrid Docs**: [docs.sendgrid.com](https://docs.sendgrid.com)
- **Vite Docs**: [vitejs.dev](https://vitejs.dev)

---

## 🆘 Support

**Need help?**
- Check troubleshooting section above
- Review environment variables carefully
- Check Render service logs
- File an issue on GitHub

---

**Built with ❤️ using the MERN Stack**
