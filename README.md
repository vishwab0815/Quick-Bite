# 🍽️ QuickBite - Counter Billing & Token System for Restaurants

QuickBite is a MERN-stack billing and token system sold to restaurants as a subscription
(Rameshwaram Cafe-style counters). Each hotel gets fast counter billing, automatic thermal printing,
kitchen screens, a token TV, WhatsApp bills and a live owner dashboard. The platform owner runs every
hotel from a hidden console: enable / disable hotels, see their orders, income, menu and sales, and
record subscription payments.

## Screens

| Who | Where | What |
|-----|-------|------|
| Everyone | `/` | QuickBite landing page with a live token board, menu and "Book a demo" |
| Hotel staff & owners | `/signin` | Sign in (no public sign-up - logins are created for them) |
| Cashier | `/pos` | Fast billing: tap or type dishes, cash / UPI / card, automatic printing, WhatsApp bill |
| Kitchen | `/pos/kitchen` | Per-counter tickets, Ready / Served, coupon QR scanning |
| Hotel owner | `/pos/bills` | Live dashboard: sales vs last week, payment mix, counter speed, bills, cash check |
| Hotel owner | `/pos/menu`, `/pos/staff` | Menu (with bulk import) and staff logins |
| Diners | `/tv/<hotel-address>` | The hotel's token TV ("Ready - collect at Dosa Counter") |
| Diners | `/receipt/<id>` | E-receipt link sent on WhatsApp / QR on the bill |
| **Platform owner** | **`/console`** | **Hidden console - every hotel, subscriptions, payments, activity log** |

## 🛡️ Platform console (`/console`)

Only the platform owner (role `superadmin`) can open it. It is not linked anywhere, and its API answers
**404** to everyone else, so it looks like it doesn't exist.

- **Overview** - hotels billing now, monthly recurring revenue, payments collected this month, orders and
  sales across all hotels (today, 30 days, 30-day chart), top hotels, hotels that need attention.
- **Hotels** - search and filter (active, renewing soon, expired, disabled, free trial); per hotel: plan,
  paid-until date, today's and 30-day orders and sales, last order. **Add hotel** creates the hotel and its
  owner login in one step.
- **Hotel page** - enable / disable switch, and tabs for **Overview** (sales, 30-day chart, payment mix,
  best sellers, account), **Sales** (any day's bills and totals), **Menu**, **Staff** (reset any login's
  password), **Subscription** (record payments, change plan / fee / grace days, payment history) and
  **Settings** (name, address, GST, UPI ID, bill prefix, receipt options).
- **Payments** - every subscription payment, totals for the month, financial year and all time.
- **Activity log** - every console sign-in and change, with who, when, which hotel and IP address.

### Subscriptions
Each hotel has a **paid-until date** plus a few **grace days** (default 3). After that its staff can't sign
in or bill; the counter shows "Subscription expired" and the token TV goes blank. Nothing is deleted.
Recording a payment extends the paid period by the months paid (from the current paid date, or from today
if it had lapsed) and the hotel works again at once. **Disable hotel** switches a hotel off immediately
(within 15 seconds, even mid-session) regardless of payment.

### Security
- **Every query is scoped to the signed-in hotel** - a hotel can never read or change another hotel's bills,
  menu, staff or customers, even by guessing IDs (covered by tests).
- **Platform owner logins can only be created from the command line** (`npm run create-platform-owner`) -
  no API or screen can grant that role. Console sessions last 8 hours (hotel sessions 24 hours).
- Roles, hotel status and subscription are re-checked on every request (15-second cache).
- No public sign-up. Login is rate limited (5 failures per 15 minutes per IP) and takes the same time for a
  wrong email as for a wrong password (no account discovery). Old website customer accounts cannot sign in.
- Optional `PLATFORM_IP_ALLOWLIST` limits the console to your own IP addresses.
- httpOnly secure cookies, Helmet headers, CORS allow-list, NoSQL-injection sanitising, 1 MB body limit,
  passwords hashed with bcrypt, customers' phone numbers never shown on public pages or in the console.

## 🧾 Counter billing

**Flow:** the cashier taps dishes on `/pos` and confirms → printing starts automatically. With a mobile
number the bill goes on WhatsApp and only the token slips print; without one, the full bill and token slips
print → each food counter sees its items on `/pos/kitchen` and taps **Ready** → the token TV shows
"Ready - collect at Dosa Counter" → staff scan the coupon QR (or type the token) to mark it **Served**.
A coupon can't be served twice.

- **Bills & GST:** prices always come from the database. Bills are numbered per hotel per financial year
  (`QB/2026-27/000123`) and tokens reset daily. By default menu prices include GST. GST scheme, rate,
  GSTIN and bill prefix are set per hotel in the console.
- **UPI:** the counter shows a QR with the exact amount, paid straight to the hotel's UPI ID (no gateway fee).
- **Regular customers:** typing the first digits of a number finds the customer and offers **Repeat last order**.
- **Menu:** each dish has a price, a food counter, a category and a veg / non-veg mark. **Bulk import** accepts
  lines like `Masala Dosa, 80, Dosa Counter, Dosa, veg` or rows pasted from Excel.
- **Printing:** 80 mm / 58 mm thermal rolls. For one-click silent printing, set the thermal printer as the
  Windows default and open the counter with `tools/start-counter.bat` (Chrome `--kiosk-printing`).
- **WhatsApp:** a free "Send on WhatsApp" link works out of the box; set `WHATSAPP_*` for fully automatic
  sending through the WhatsApp Cloud API (template text in `Backend/.env.example`).

## 🛠️ Tech stack
React 19 + Vite 6 + Tailwind CSS 4 · Node.js 20+ / Express 5 · MongoDB (Mongoose 8) · JWT cookie sessions ·
node:test + supertest + mongodb-memory-server.

## 🚀 Run it locally

**No database needed (demo mode):**
```bash
cd Backend && npm install && npm run demo      # in-memory database with two sample hotels
cd Frontend && npm install && npm run dev      # Frontend/.env: VITE_API_URL=http://localhost:3000
```
Demo logins: console `owner@quickbite.app` / `Platform1234` · hotel owner `admin@gmail.com` / `Admin1234` ·
cashier `counter@quickbite.com` / `Counter1234`. Everything resets when the backend stops.

**With your own MongoDB:** copy `Backend/.env.example` to `Backend/.env`, set `MONGO_URI` and `JWT_SECRET`,
then `npm run dev`. Create your platform owner login once with `npm run create-platform-owner`, sign in and
add hotels from `/console`.

### Scripts (Backend)
```bash
npm run dev                     # development server (nodemon)
npm start                       # production server
npm test                        # API tests against an in-memory MongoDB
npm run demo                    # in-memory database + sample hotels (wiped on stop)
npm run create-platform-owner   # create / reset the console login (uses MONGO_URI)
```

## 🌐 Production (Render)

Backend **Web Service** (root `Backend`, start `npm start`) + frontend **Static Site** (root `Frontend`,
build `npm install && npm run build`, publish `dist`). Pushing to `main` redeploys both. Step-by-step: [SETUP.md](SETUP.md).

**Backend environment:** `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (64+ random characters),
`FRONTEND_URL`. Optional: `JWT_EXPIRES_IN` (24h), `JWT_PLATFORM_EXPIRES_IN` (8h), `PLATFORM_IP_ALLOWLIST`,
`SHOWCASE_HOTEL` (hotel address shown live on the landing page; default: the first active hotel),
`PUBLIC_RECEIPT_BASE_URL`, `TRUST_PROXY`, `WHATSAPP_*`. Hotel details are no longer environment variables -
they live in each hotel's settings (the old `HOTEL_*` / `UPI_*` values are only used once, to create the
first hotel when an existing single-restaurant database is upgraded).

**Frontend environment:** `VITE_API_URL=<backend URL>`, `VITE_SALES_WHATSAPP` (your number with country
code, e.g. `919876543210` - "Book a demo" opens a WhatsApp chat with you).

**Upgrading an existing database:** on its first start the server moves the existing bills, menu, customers
and logins into one hotel (named from `HOTEL_NAME`, 30 days paid) and continues the bill numbering. It only
adds data and does nothing on later starts.

### Keeping the API awake (free plan)
Render's free plan sleeps after 15 minutes without traffic. [`keep-alive.yml`](.github/workflows/keep-alive.yml)
pings `/health` every 5 minutes, the frontend wakes the API as soon as any page opens, and an UptimeRobot
monitor on `<backend URL>/health` is a good free backup. `/health` also reports whether MongoDB is
connected and, if not, why. Render's Starter plan ($7/month) removes sleeping entirely.

## ✅ CI (GitHub Actions)
| Workflow | Runs | Checks |
|---|---|---|
| Backend CI | changes in `Backend/` | 30 API tests (billing, hotel isolation, console, subscriptions) on Node 20 & 22 + server boot check |
| Frontend CI | changes in `Frontend/` | ESLint + production build |
| Repository Checks | every push / PR | required files, no `.env` committed, no hardcoded secrets |
| Pull Request Checks | PRs | title format, model changes, files over 1 MB |
| Keep API Awake | every 5 minutes | pings the live API |

## 📝 License
MIT
