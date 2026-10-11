# 🍕 QuickBite - Modern Food Delivery Platform

A full-stack restaurant management and food delivery application built with the MERN stack. Features a beautiful gradient-themed UI, secure authentication, real-time order management, admin dashboard, cloud image storage, and automated email notifications.

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based authentication with HTTP-only cookies
- Role-based access control (User/Admin roles)
- Password hashing with bcrypt (12 rounds)
- Enhanced password validation (8+ chars, uppercase, lowercase, number)
- Rate limiting to prevent brute force attacks (5 login attempts/15min)
- Input validation and sanitization
- CORS protection with configurable origins
- NoSQL injection protection
- XSS protection with Helmet security headers

### 🍔 Food Menu & Shopping
- Browse delicious food items with beautiful 3D animations
- **3D Cubic Gallery** - Interactive rotating gallery with mouse control
- Filter by meal type (Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer, Side Dish, Main Course)
- Animated category filter bar with gradient icons
- Detailed food item pages with ingredients and nutrition info
- **Pricing system** - Consistent pricing across all food items
- Shopping cart with quantity management and customizations
- Persistent cart using localStorage
- Real-time cart badge with item count

### 👨‍💼 Admin Food Management
- **Create** new food items with all details
- **Update** existing food items (name, price, ingredients, etc.)
- **Delete** food items from menu
- **Upload images** to Cloudinary with automatic optimization
- Image resizing (800x800px max) and quality optimization
- Unique ID generation for new items
- Full CRUD operations protected by admin authentication

### 📦 Order Management

#### For Users:
- Complete checkout flow with delivery address
- Multiple payment methods (Cash, Card, Online, Wallet)
- **Order History** page to view all past orders
- **Cancel orders** - Cancel pending/confirmed orders
- Order status tracking (Pending → Confirmed → Preparing → Ready → Delivered)
- Filter orders by status
- Order details with items, quantities, and pricing
- Beautiful **Order Success** page with order summary and estimated delivery time

#### For Admins:
- Comprehensive order management dashboard
- Real-time statistics (total, pending, confirmed, preparing, ready, delivered)
- **Update order status** - One-click status changes
- **Delete orders** - Remove orders from system
- Filter orders by status
- View all customer orders across the platform
- Customer information display
- Admin-only access with role verification

### 📧 Email Notifications
- Welcome email on registration with branded template
- Order confirmation emails with order details
- Beautiful responsive HTML templates
- Powered by SendGrid (100 free emails/day)
- Non-blocking async email delivery

### 📸 Image Upload & Storage
- **Cloudinary Integration** - Cloud-based image storage
- Automatic image optimization and resizing
- 5MB max file size limit
- Support for JPEG, PNG, WEBP, GIF formats
- CDN delivery for fast loading
- Public URLs for easy sharing
- **Free Tier**: 25GB storage, 25GB bandwidth/month

### 🎨 Modern UI/UX
- **Gradient Theme**: Consistent orange → pink → purple color scheme
- Smooth animations with Framer Motion
- Floating label inputs with gradient focus states
- Glassmorphism effects and backdrop blur
- Toast notifications for user feedback
- Responsive design for all devices (mobile, tablet, desktop)
- Error boundaries for graceful error handling
- Loading states with animated spinners
- Profile dropdown menu with proper z-index stacking

## 🛠️ Tech Stack

### Frontend
- **React** 19.1.0 - UI framework with hooks
- **React Router DOM** 7.6.0 - Client-side routing
- **Vite** 6.3.5 - Fast build tool and dev server
- **Tailwind CSS** 4.1.5 - Utility-first CSS framework
- **Framer Motion** 12.10.4 - Production-ready animations
- **Axios** 1.9.0 - HTTP client with interceptors
- **React Toastify** 11.0.5 - Beautiful notifications
- **React Icons** 5.5.0 - Icon library

### Backend
- **Node.js** ≥16.0.0 - JavaScript runtime
- **Express** 5.1.0 - Web framework
- **MongoDB** with Mongoose 8.14.1 - NoSQL database with ODM
- **JWT** (jsonwebtoken 9.0.2) - Secure authentication
- **bcryptjs** 2.4.3 - Password hashing
- **SendGrid** - Transactional email service
- **Cloudinary** 2.8.0 - Image upload and storage
- **Multer** 1.4.5-lts.1 - File upload middleware
- **Helmet** 8.1.0 - Security headers
- **Express Rate Limit** 8.2.1 - DDoS protection
- **Express Mongo Sanitize** 2.2.0 - NoSQL injection protection
- **cookie-parser** 1.4.7 - Cookie parsing middleware

## 📁 Project Structure

```
QuickBite/
├── Backend/
│   ├── config/
│   │   ├── sendgrid.js              # SendGrid email configuration & templates
│   │   └── cloudinary.js            # Cloudinary image upload configuration
│   ├── controllers/
│   │   ├── userAuth.controller.js   # Authentication (register, login, logout, profile)
│   │   ├── foodItems.controller.js  # Food items CRUD + image upload
│   │   └── order.controller.js      # Order management, status updates & cancellation
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication middleware
│   │   ├── adminAuth.js             # Admin authorization middleware
│   │   ├── validation.js            # Input validation & sanitization
│   │   └── logger.js                # Request logging
│   ├── models/
│   │   ├── userauthentication.model.js  # User schema with role
│   │   ├── fooditems.model.js           # Food item schema with price
│   │   └── order.model.js               # Order schema with status
│   ├── router/
│   │   ├── userAuth.router.js       # Auth routes
│   │   ├── foodItems.router.js      # Food routes + admin CRUD
│   │   └── orders.router.js         # Order routes + cancellation
│   ├── db/
│   │   └── db.js                    # MongoDB connection
│   ├── app.js                       # Express app configuration
│   ├── server.js                    # Server entry point
│   ├── seedDatabase.js              # Database seeding script
│   ├── food.json                    # Food items seed data (30 recipes)
│   ├── .env.example                 # Environment variables template
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Cart/
│   │   │   │   └── CartSidebar.jsx          # Shopping cart sidebar
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx               # Reusable gradient button
│   │   │   │   ├── Input.jsx                # Floating label input
│   │   │   │   └── ErrorBoundary.jsx        # Error handler
│   │   │   ├── animation/
│   │   │   │   └── CubicGallery.jsx         # 3D rotating gallery
│   │   │   ├── InfoCard.jsx                 # Food detail card
│   │   │   └── cards.jsx                    # Food item cards
│   │   ├── context/
│   │   │   └── CartContext.jsx              # Cart state management
│   │   ├── pages/
│   │   │   ├── Home.jsx                     # Home page with food grid
│   │   │   ├── GetStarted.jsx               # Landing page
│   │   │   ├── Signin.jsx                   # Login page
│   │   │   ├── Register.jsx                 # Registration page
│   │   │   ├── Checkout.jsx                 # Checkout flow
│   │   │   ├── OrderSuccess.jsx             # Order confirmation page
│   │   │   ├── OrderHistory.jsx             # User's order history
│   │   │   ├── AdminDashboard.jsx           # Admin order management
│   │   │   ├── Categories.jsx               # Category filter bar
│   │   │   ├── Navbar.jsx                   # Navigation with profile menu
│   │   │   ├── Contact.jsx                  # Contact page
│   │   │   └── Services.jsx                 # Services page
│   │   ├── utils/
│   │   │   ├── constants.js                 # Design system constants
│   │   │   └── toast.js                     # Toast notifications helper
│   │   ├── styles/
│   │   │   └── index.css                    # Global styles & Tailwind
│   │   ├── App.jsx                          # Main app with routes
│   │   └── main.jsx                         # Entry point
│   ├── .env.example                         # Environment variables template
│   └── package.json
│
├── .gitignore
└── README.md                        # This file - complete documentation
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required | Validation |
|--------|----------|-------------|---------------|------------|
| POST | `/api/auth/register` | Register new user | No | ✅ Email, Password, Name |
| POST | `/api/auth/login` | Login user | No | ✅ Email, Password |
| POST | `/api/auth/logout` | Logout user | Yes (User) | - |
| GET | `/api/auth/profile` | Get user profile | Yes (User) | - |

### Food Items (`/fooditems`)
| Method | Endpoint | Description | Auth Required | Validation |
|--------|----------|-------------|---------------|------------|
| POST | `/fooditems/fetch` | Seed database (one-time setup) | Yes (Admin) | - |
| GET | `/fooditems/get` | Get all food items (paginated) | No | - |
| GET | `/fooditems/meal-type/:mealType` | Get items by meal type | No | - |
| GET | `/fooditems/food/:id` | Get single food item by ID | No | - |
| **POST** | **`/fooditems/upload-image`** | **Upload image to Cloudinary** | Yes (Admin) | ✅ File type, size |
| **POST** | **`/fooditems/create`** | **Create new food item** | Yes (Admin) | ✅ All required fields |
| **PUT** | **`/fooditems/update/:id`** | **Update food item** | Yes (Admin) | ✅ Valid ID |
| **DELETE** | **`/fooditems/delete/:id`** | **Delete food item** | Yes (Admin) | ✅ Valid ID |

### Orders (`/success`)
| Method | Endpoint | Description | Auth Required | Validation |
|--------|----------|-------------|---------------|------------|
| POST | `/success/order` | Create new order | Yes (User) | ✅ Items, Total |
| GET | `/success/orders` | Get user's orders | Yes (User) | - |
| GET | `/success/order/:id` | Get specific order | Yes (User) | ✅ Valid ID |
| **PATCH** | **`/success/order/:id/cancel`** | **Cancel order (pending/confirmed only)** | Yes (User/Admin) | ✅ Valid ID |
| GET | `/success/admin/orders` | Get all orders (all users) | Yes (Admin) | - |
| PATCH | `/success/order/:id/status` | Update order status | Yes (Admin) | ✅ Valid status |
| **DELETE** | **`/success/order/:id`** | **Delete order permanently** | Yes (Admin) | ✅ Valid ID |

### Counter Billing / POS (`/pos`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/pos/settings` | Hotel, GST, UPI & counter settings | Yes (Staff/Admin) |
| GET | `/pos/menu` | Full menu incl. sold-out items | Yes (Staff/Admin) |
| PATCH | `/pos/menu/:id/availability` | Mark item sold out / available | Yes (Staff/Admin) |
| POST | `/pos/menu` | Add menu item | Yes (Admin) |
| PUT | `/pos/menu/:id` | Edit menu item | Yes (Admin) |
| DELETE | `/pos/menu/:id` | Remove menu item | Yes (Admin) |
| POST | `/pos/menu/import` | Bulk add / update items by name | Yes (Admin) |
| GET / POST | `/pos/staff` | List / add counter staff logins | Yes (Admin) |
| PATCH | `/pos/staff/:id/password` | Reset a staff or admin password | Yes (Admin) |
| DELETE | `/pos/staff/:id` | Remove a staff login | Yes (Admin) |
| POST | `/pos/bills` | Create bill → token number (+ WhatsApp receipt) | Yes (Staff/Admin) |
| GET | `/pos/bills?date=YYYY-MM-DD` | Bills for a day | Yes (Staff/Admin) |
| PATCH | `/pos/bills/:id/stations` | Counter status: preparing / ready / served | Yes (Staff/Admin) |
| POST | `/pos/serve` | Serve by scanned coupon QR or token number (once per counter) | Yes (Staff/Admin) |
| POST | `/pos/bills/:id/whatsapp` | Send / resend WhatsApp receipt | Yes (Staff/Admin) |
| GET | `/pos/kitchen?counter=` | Open tickets for a kitchen counter | Yes (Staff/Admin) |
| GET | `/pos/reports/summary?date=` | Daily sales, cash vs UPI, GST, items | Yes (Staff/Admin) |
| PATCH | `/pos/bills/:id/cancel` | Cancel a bill (reason required) | Yes (Admin) |
| GET | `/pos/display` | Token TV board (token numbers only) | No |
| GET | `/pos/receipt/:publicId` | E-receipt opened from WhatsApp / QR | No |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status & environment |

## 🔒 Security Features

- ✅ **Authentication**: JWT tokens with HTTP-only cookies (prevents XSS)
- ✅ **Authorization**: Role-based access control (User/Admin)
- ✅ **Password Security**: bcrypt hashing with 12 rounds
- ✅ **Password Validation**: Minimum 8 chars, uppercase, lowercase, number
- ✅ **Rate Limiting**: 100 req/15min (general), 5 failed login/register attempts per 15min
- ✅ **Input Validation**: All inputs validated and sanitized
- ✅ **NoSQL Injection Protection**: Express-mongo-sanitize
- ✅ **XSS Protection**: Helmet security headers
- ✅ **CORS**: Configured for specific origins only
- ✅ **File Upload Security**: File type and size validation
- ✅ **Environment Variables**: No hardcoded secrets
- ✅ **Error Handling**: No sensitive data leakage in responses
- ✅ **Database Seed Protection**: Admin-only access

## 📊 Database Schema

### User Model
- `name` - User's full name (min 2 chars)
- `email` - Unique email (indexed, validated)
- `password` - Hashed password (not returned in responses)
- `role` - User role: `user` (default) / `admin`
- `timestamps` - Created and updated timestamps

### Food Item Model
- `id` - Unique numeric food item ID
- `name` - Food name (required)
- `ingredients` - Array of ingredients
- `prepTimeMinutes` - Preparation time
- `cookTimeMinutes` - Cooking time
- `servings` - Number of servings
- `difficulty` - Easy/Medium/Hard
- `cuisine` - Cuisine type (required)
- `caloriesPerServing` - Nutritional info
- `tags` - Search tags
- `image` - Image URL (required, from Cloudinary)
- **`price`** - **Price in dollars (required, min: 0)**
- `rating` - Average rating (0-5)
- `reviewCount` - Number of reviews
- `mealType` - Category array (Breakfast, Lunch, etc.)
- `customizations` - Available customizations object
- `timestamps` - Created and updated timestamps

### Order Model
- `userId` - Reference to user (indexed)
- `items` - Array of ordered items with quantities and customizations
- `totalAmount` - Order total (required)
- `deliveryAddress` - Delivery details (street, city, state, zipCode, country)
- `paymentMethod` - Cash/Card/Online/Wallet
- `paymentStatus` - Pending/Completed/Failed/Refunded
- `status` - pending/confirmed/preparing/ready/delivered/cancelled (indexed)
- `orderDate` - Timestamp (indexed)
- `timestamps` - Created and updated timestamps

## 👨‍💼 Default Admin Credentials

After seeding a development database, you can log in as:

| Role | Email | Password |
|------|-------|----------|
| Admin (owner) | `admin@gmail.com` | `Admin1234` |
| Counter staff | `counter@quickbite.com` | `Counter1234` |

These demo passwords are only for development. In production the seed script requires
`SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD`, and refuses to run without `--force` because it wipes all data.
Change passwords anytime from `/pos/staff`.

## 🎨 Design System

The application follows a consistent design system:

- **Color Palette**: Orange (#f97316) → Pink (#ec4899) → Purple (#a855f7)
- **Gradients**: `from-orange-500 to-pink-500` for primary actions
- **Typography**: Inter font family (from Tailwind defaults)
- **Spacing**: Consistent 8px grid system
- **Border Radius**: `rounded-2xl` for cards, `rounded-full` for pills
- **Shadows**: `shadow-lg` for cards, `shadow-2xl` for modals
- **Z-Index**: Proper stacking (navbar: 50, modals: 100, dropdowns: 100)
- **Animations**: Framer Motion with spring physics

## 🚀 Quick Start

### Prerequisites
- Node.js ≥16.0.0
- MongoDB (local or Atlas)
- Cloudinary account (free tier)
- SendGrid account (optional, for emails)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd QuickBite
```

2. **Install dependencies**
```bash
# Install root dependencies (for running both servers)
npm install

# Or install separately
cd Backend && npm install
cd ../Frontend && npm install
```

3. **Configure environment variables**

**Backend** (`Backend/.env`):
```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/quickbite
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Cloudinary (Required for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SendGrid (Optional)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@quickbite.com
SENDGRID_FROM_NAME=QuickBite

# CORS
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`Frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

4. **Setup Cloudinary** (Free Tier - 25GB storage)
   - Sign up: https://cloudinary.com/users/register/free
   - Get credentials from: https://console.cloudinary.com/settings
   - Add to Backend/.env

5. **Seed the database**
```bash
cd Backend
npm run seed
```

6. **Run the application**

Using root scripts (recommended):
```bash
# From root directory
npm run dev  # Runs both frontend and backend
```

Or separately:
```bash
# Terminal 1 - Backend
cd Backend
npm run dev

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/health

## 🧾 Counter Billing (Token System)

Rameshwaram Cafe-style counter billing for walk-in customers: pay at the counter (cash / UPI / card),
get a token, and collect food at each food counter.

**Flow:** Cashier bills on `/pos` → bill + token prints (with one coupon per food counter) and/or the
receipt goes on WhatsApp → each counter sees its items on `/pos/kitchen` and taps **Ready** →
the token TV (`/pos/display`) shows "Ready – collect at Dosa Counter" → staff scan the coupon QR
(or type the token number) to mark it **Served**. A coupon can't be served twice.

| Screen | URL | Who |
|--------|-----|-----|
| Billing counter | `/pos` | Staff / Admin |
| Kitchen / counter screen | `/pos/kitchen` | Staff / Admin |
| Today's bills, cash check & reports | `/pos/bills` | Staff / Admin (only admin can cancel) |
| Menu: add / edit / remove items, bulk import | `/pos/menu` | Admin |
| Staff logins: add, reset password, remove | `/pos/staff` | Admin |
| Token TV | `/pos/display` | Public (no prices or customer details) |
| E-receipt | `/receipt/:id` | Public link (sent on WhatsApp / QR on bill) |

Staff accounts go straight to `/pos` after login. Roles are checked against the database on every
counter request, so removing a staff login signs them out immediately.

**Setup notes**
- **Hotel details, GST & UPI:** set `HOTEL_*`, `GST_SCHEME`, `GST_RATE`, `PRICES_INCLUDE_GST` and `UPI_VPA` in `Backend/.env`
  (see `.env.example`). Prices always come from the database; bills are numbered per financial year
  (`QB/2026-27/000123`) and tokens reset daily.
- **Menu & food counters:** the counter menu is separate from the website's recipes. Each item has a price, a food
  counter (e.g. `Dosa Counter`, `Beverages`), a category and a veg / non-veg mark. Coupons and kitchen screens are
  grouped by counter. Seeding loads a sample South Indian menu (`Backend/menu.json`); replace it from `/pos/menu`,
  where **Bulk import** accepts lines like `Masala Dosa, 80, Dosa Counter, Dosa, veg` or rows pasted from Excel.
- **Printing:** receipts print from the browser on 80mm or 58mm thermal rolls (`RECEIPT_PAPER_WIDTH`). For one-tap
  printing without the dialog, start Chrome on the counter PC with `--kiosk-printing` and set the thermal printer as default.
  Print bill / counter coupons / WhatsApp can each be switched on or off at the counter.
- **WhatsApp receipts:** works out of the box via a free "Send on WhatsApp" link (wa.me). For fully automatic sending,
  create a *Utility* template in Meta WhatsApp Manager and set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and
  `WHATSAPP_TEMPLATE_NAME` (template text is in `.env.example`). Receipt links need the frontend hosted publicly
  (`PUBLIC_RECEIPT_BASE_URL`).
- **UPI:** the counter shows a QR with the exact bill amount, paid straight to the hotel's UPI ID (no gateway fee).
  The cashier taps **Payment received** after the soundbox confirms.

## 📸 Image Upload Usage

### Method 1: File Upload (Recommended)
```javascript
// Upload image first
const formData = new FormData();
formData.append('image', imageFile);

const uploadRes = await axios.post(
  'http://localhost:3000/fooditems/upload-image',
  formData,
  {
    withCredentials: true,
    headers: { 'Content-Type': 'multipart/form-data' }
  }
);

const imageUrl = uploadRes.data.data.url;

// Then create food item with the URL
const foodItem = {
  name: "Pizza",
  image: imageUrl,
  price: 12.99,
  // ... other fields
};
```

### Method 2: Direct URL
```javascript
// Provide image URL directly
const foodItem = {
  name: "Pizza",
  image: "https://res.cloudinary.com/your-cloud/image/upload/v123/pizza.jpg",
  price: 12.99,
  // ... other fields
};
```

## 🎯 Available Scripts

### Root Directory
```bash
npm run dev              # Run both frontend and backend concurrently
npm run dev:backend      # Run backend only
npm run dev:frontend     # Run frontend only
npm run install:all      # Install all dependencies (root, backend, frontend)
```

### Backend
```bash
npm run dev              # Start development server with nodemon
npm start                # Start production server
npm run seed             # Seed database (wipes data!) with logins, food items and sample counter menu
npm test                 # API tests against an in-memory MongoDB
npm run demo             # Try the app without MongoDB: in-memory DB + dummy data (wiped on stop)
```

### Frontend
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🌐 Production Deployment

### Backend (Render/Railway/Heroku)
1. Set environment variables:
   - `NODE_ENV=production`
   - `MONGO_URI=<your-mongodb-atlas-uri>`
   - `JWT_SECRET=<random-64-char-string>`
   - `FRONTEND_URL=<your-frontend-url>`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

2. Ensure HTTPS is enabled (required for cookies)

### Frontend (Vercel/Netlify)
1. Set environment variable:
   - `VITE_API_URL=<your-backend-url>`

2. Build command: `npm run build`
3. Output directory: `dist`

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **SendGrid** - Email delivery service
- **Cloudinary** - Image hosting and optimization
- **MongoDB** - Database
- **Tailwind CSS** - Styling framework
- **Framer Motion** - Animation library
- **React Icons** - Icon library

---

**Built with ❤️ using the MERN Stack**

This is a **production-ready** application with:
- ✅ Enterprise-grade security
- ✅ Complete CRUD operations
- ✅ Cloud image storage
- ✅ Order management system
- ✅ Admin dashboard
- ✅ Email notifications
- ✅ Modern UI/UX
- ✅ Comprehensive error handling
- ✅ Best practices throughout

**QuickBite - Where Great Food Meets Modern Technology** 🍕🚀
