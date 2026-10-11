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
npm run seed      # Seed database with admin user and food items
npm run dev       # Start backend on http://localhost:3000

# 3. Setup Frontend (new terminal)
cd Frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3000
npm run dev       # Start frontend on http://localhost:5173
```

### Default Admin Credentials
After seeding:
- **Email**: `admin@gmail.com`
- **Password**: `Admin1234` (⚠️ Change after first login!)

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
   • Deploy

STEP 5: Update CORS
   ↓
   • Go to Backend service on Render
   • Update FRONTEND_URL environment variable
   • Set to: https://your-frontend.onrender.com
   • Backend will auto-redeploy

STEP 6: Seed Production Database (first deploy only - it wipes ALL data)
   ↓
   • Set SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD (required in production)
   • Backend service → Shell tab
   • Run: node seedDatabase.js --force
   • Creates admin + counter staff logins, food items and the sample counter menu

STEP 7: Test Deployment
   ↓
   • Visit your frontend URL
   • Test registration, login, ordering
   • Login as admin to test dashboard

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
JWT_EXPIRES_IN=7d
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
| `JWT_EXPIRES_IN` | `7d` | ✅ | Token expiration |
| `SENDGRID_API_KEY` | `SG.xxxxx` | ❌ | Optional - for emails |
| `SENDGRID_FROM_EMAIL` | `your@email.com` | ❌ | Must be verified in SendGrid |
| `SENDGRID_FROM_NAME` | `QuickBite` | ❌ | Sender name |
| `FRONTEND_URL` | `https://your-app.onrender.com` | ✅ | Your frontend URL |

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
- [ ] Seed with your own `SEED_ADMIN_PASSWORD` / `SEED_STAFF_PASSWORD` (never the demo passwords)
- [ ] Replace the sample counter menu from `/pos/menu` and add staff logins from `/pos/staff`
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

**❌ Render Free Tier Slow Start**
```
Info: Free tier services spin down after 15 mins of inactivity
Solution: Upgrade to paid plan for always-on instances
```

---

## 🎯 Quick Reference

### Local Development URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### Default Credentials (development seed only)
- **Admin**: admin@gmail.com / Admin1234
- **Counter staff**: counter@quickbite.com / Counter1234
- Production seeding requires `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD`

### Important Commands

```bash
# Backend
npm run dev          # Development mode with auto-reload
npm start            # Production mode
npm run seed         # Seed database with initial data

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
