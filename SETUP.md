# 🚀 QuickBite - Setup & Deployment Guide

- [Local development](#-local-development)
- [Production deployment (Render)](#-production-deployment-render)
- [Adding a hotel](#-adding-a-hotel)
- [Environment variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🖥️ Local development

**Prerequisites:** Node.js 20+, Git. MongoDB is optional (demo mode runs an in-memory database).

```bash
# Backend
cd Backend
npm install
cp .env.example .env      # set MONGO_URI and JWT_SECRET (or skip and use demo mode)
npm run demo              # in-memory database + two sample hotels, OR: npm run dev

# Frontend (new terminal)
cd Frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm run dev               # http://localhost:5173
```

**Demo logins** (`npm run demo` only): console `owner@quickbite.app` / `Platform1234` ·
hotel owner `admin@gmail.com` / `Admin1234` · cashier `counter@quickbite.com` / `Counter1234`.

**Your own database:** run `npm run create-platform-owner` in `Backend` once (uses `MONGO_URI` from `.env`),
sign in at `/signin` - you land on `/console` - and add hotels there.

---

## 🌐 Production deployment (Render)

```
STEP 1  MongoDB Atlas
        • Free cluster at cloud.mongodb.com, a database user with a strong password
        • Network Access → allow 0.0.0.0/0 (Render's IPs change)
        • Connection string: mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/quickbite?retryWrites=true&w=majority

STEP 2  Backend → Render → New → Web Service
        • Root Directory: Backend · Build: npm install · Start: npm start
        • Environment: NODE_ENV=production, MONGO_URI, JWT_SECRET, FRONTEND_URL (see table below)
        • Check https://<backend>.onrender.com/health → "db":"connected"

STEP 3  Frontend → Render → New → Static Site
        • Root Directory: Frontend · Build: npm install && npm run build · Publish: dist
        • Environment: VITE_API_URL=<backend URL>, VITE_SALES_WHATSAPP=<your WhatsApp number, e.g. 919876543210>
        • Redirects/Rewrites (recommended): Source /*  →  Destination /index.html  (Rewrite)
          Deep links like /pos/kitchen, /tv/... and /receipt/... also work without it (404.html fallback).

STEP 4  Platform owner login (once)
        • On your computer: put the production MONGO_URI in Backend/.env and run
            npm run create-platform-owner      (asks for email + a 12+ character password)
        • Remove MONGO_URI from Backend/.env afterwards
        • Sign in at <frontend>/signin → you land on the console at /console

STEP 5  Hotels
        • Console → Hotels → Add hotel (creates the hotel and its owner login)
        • Give the owner their login; they add the menu at /pos/menu and cashiers at /pos/staff

Redeploying: push to main - Render rebuilds both services.
```

**Upgrading the old single-restaurant database:** nothing to do. On its first start the server moves the
existing bills, menu, customers and logins into one hotel (named from `HOTEL_NAME`, 30 days paid), keeps the
bill numbering going and switches to per-hotel indexes. It only adds data and does nothing on later starts.
Then set that hotel's plan and details from the console.

---

## 🏨 Adding a hotel

1. Console → **Hotels → Add hotel**: name, web address (used for the token TV: `/tv/<address>`), owner
   name / email / password, plan, monthly fee and free days.
2. Send the owner their login. They sign in at `/signin` and land on the counter.
3. When they pay: hotel page → **Subscription → Record a payment** - the paid period is extended at once.
4. If they stop paying, the counter locks itself after the paid date + grace days. **Disable hotel** locks
   it immediately (e.g. fraud or a closed account). Nothing is ever deleted.
5. Every change is listed in **Activity log**.

---

## 📊 Environment variables

### Backend

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `NODE_ENV` | `production` | ✅ | |
| `MONGO_URI` | `mongodb+srv://...` | ✅ | From Atlas |
| `JWT_SECRET` | 64+ random hex characters | ✅ | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_URL` | `https://your-app.onrender.com` | ✅ | CORS - must match exactly, no trailing slash |
| `JWT_EXPIRES_IN` | `24h` | ❌ | Hotel login session length |
| `JWT_PLATFORM_EXPIRES_IN` | `8h` | ❌ | Console session length |
| `PLATFORM_IP_ALLOWLIST` | `203.0.113.7` | ❌ | Console only from these IPs (comma-separated) |
| `SHOWCASE_HOTEL` | `sri-ganesh-restaurant` | ❌ | Hotel shown live on the landing page (default: first active hotel) |
| `PUBLIC_RECEIPT_BASE_URL` | `https://your-app.onrender.com` | ❌ | Receipt links in WhatsApp bills (default: `FRONTEND_URL`) |
| `TRUST_PROXY` | `1` | ❌ | Defaults to 1 in production (right for Render) |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TEMPLATE_NAME` | from Meta | ❌ | Fully automatic WhatsApp bills |
| `HOTEL_NAME`, `HOTEL_*`, `UPI_*`, `GST_*` | | ❌ | Only read once, to create the first hotel when upgrading an old database |

Hotel details (address, GSTIN, GST scheme, UPI ID, bill prefix, receipt options) are set per hotel in the console.

### Frontend

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` | ✅ | Backend URL |
| `VITE_SALES_WHATSAPP` | `919876543210` | ❌ | "Book a demo" opens a WhatsApp chat with this number |

---

## 🔒 Security checklist

- [ ] Strong, unique `JWT_SECRET` (changing it signs everyone out)
- [ ] Platform owner password 12+ characters, never shared; consider `PLATFORM_IP_ALLOWLIST`
- [ ] Rotate the MongoDB password if it was ever shared, and update `MONGO_URI`
- [ ] No demo passwords in production
- [ ] Daily database backups (bills are GST records) - Atlas M0 has no automatic backups
- [ ] An UptimeRobot monitor on `<backend URL>/health`

Already built in: per-hotel data isolation, role + hotel + subscription re-checked on every request,
no public sign-up, login rate limiting, constant-time login, console invisible (404) to others, audit log,
httpOnly secure cookies, Helmet, CORS allow-list, NoSQL-injection sanitising, 1 MB request limit.

---

## 🐛 Troubleshooting

**Login fails / "cannot reach the database"** - open `<backend URL>/health`. If `"db"` is `"disconnected"`,
`"dbProblem"` says why:
- *Wrong database username or password* → fix `MONGO_URI` on Render
- *Cannot reach the database* → Atlas → Network Access → allow `0.0.0.0/0`
- *Database host not found* → check the cluster address in `MONGO_URI`

The server keeps retrying and connects within a minute of the fix.

**"Counter paused" / "Subscription expired" on a hotel's counter** - the hotel is disabled or its paid
period (plus grace days) has ended. Console → the hotel → **Subscription → Record a payment**, or **Enable hotel**.

**CORS errors** - `FRONTEND_URL` must match the frontend address exactly.

**Slow first load (free plan)** - Render sleeps after 15 idle minutes. `.github/workflows/keep-alive.yml`
pings every 5 minutes and the frontend wakes the API on page load; add UptimeRobot as a backup, or use
Render Starter ($7/month) for always-on.

---

## 🎯 Commands

```bash
# Backend
npm run dev                     # development server
npm start                       # production server
npm run demo                    # in-memory database + sample hotels
npm test                        # API tests
npm run create-platform-owner   # create / reset the console login

# Frontend
npm run dev                     # development server
npm run build                   # production build
```
