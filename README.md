# 🍕 QuickBite - Modern Food Delivery Platform

A full-stack restaurant management and food delivery application built with the MERN stack. Features a beautiful gradient-themed UI, secure authentication, real-time order management, admin dashboard, and automated email notifications.

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based authentication with HTTP-only cookies
- Role-based access control (User/Admin roles)
- Password hashing with bcrypt (12 rounds)
- Enhanced password validation (8+ chars, uppercase, lowercase, number)
- Rate limiting to prevent brute force attacks
- Input validation and sanitization
- CORS protection with configurable origins

### 🍔 Food Menu & Shopping
- Browse delicious food items with beautiful 3D animations
- **3D Cubic Gallery** - Interactive rotating gallery with mouse control
- Filter by meal type (Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer, Side Dish, Main Course)
- Animated category filter bar with gradient icons
- Detailed food item pages with ingredients and nutrition info
- Shopping cart with quantity management and customizations
- Persistent cart using localStorage

### 📦 Order Management
- Complete checkout flow with delivery address
- Multiple payment methods (Cash, Card, Online, Wallet)
- **Order History** page for users to view all past orders
- Order status tracking (Pending → Confirmed → Preparing → Ready → Delivered)
- Filter orders by status
- Order details with items, quantities, and pricing

### 👨‍💼 Admin Dashboard
- Comprehensive order management system
- Real-time statistics (total, pending, confirmed, preparing, ready, delivered)
- One-click order status updates
- Filter orders by status
- Refresh functionality for latest data
- Admin-only access with role verification

### 📧 Email Notifications
- Welcome email on registration with branded template
- Order confirmation emails with order details
- Beautiful responsive HTML templates
- Powered by SendGrid (100 free emails/day)
- Non-blocking async email delivery

### 🎨 Modern UI/UX
- **Gradient Theme**: Consistent orange → pink → purple color scheme
- Smooth animations with Framer Motion
- Floating label inputs with gradient focus states
- Glassmorphism effects and backdrop blur
- Toast notifications for user feedback
- Responsive design for all devices (mobile, tablet, desktop)
- Error boundaries for graceful error handling
- Loading states with animated spinners

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
- **Helmet** 8.0.0 - Security headers
- **Express Rate Limit** 7.5.0 - DDoS protection
- **cookie-parser** 1.4.7 - Cookie parsing middleware

## 📁 Project Structure

```
QuickBite/
├── Backend/
│   ├── config/
│   │   └── sendgrid.js              # SendGrid email configuration & templates
│   ├── controllers/
│   │   ├── userAuth.controller.js   # Authentication (register, login, logout, profile)
│   │   ├── foodItems.controller.js  # Food items CRUD operations
│   │   └── order.controller.js      # Order management & status updates
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication middleware
│   │   ├── adminAuth.js             # Admin authorization middleware
│   │   ├── validation.js            # Input validation & sanitization
│   │   └── logger.js                # Request logging
│   ├── models/
│   │   ├── userauthentication.model.js  # User schema with role
│   │   ├── fooditems.model.js           # Food item schema
│   │   └── order.model.js               # Order schema with status
│   ├── router/
│   │   ├── userAuth.router.js       # Auth routes
│   │   ├── foodItems.router.js      # Food routes
│   │   └── orders.router.js         # Order routes
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
│   │   │   ├── cards.jsx                    # Food item cards
│   │   │   └── PlacedOrder.jsx              # Order success page
│   │   ├── context/
│   │   │   └── CartContext.jsx              # Cart state management
│   │   ├── pages/
│   │   │   ├── Home.jsx                     # Home page with food grid
│   │   │   ├── GetStarted.jsx               # Landing page
│   │   │   ├── Signin.jsx                   # Login page
│   │   │   ├── Register.jsx                 # Registration page
│   │   │   ├── Checkout.jsx                 # Checkout flow
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
├── ecosystem.config.js              # Process manager configuration
├── .gitignore
├── README.md                        # This file - project overview
└── SETUP.md                         # Installation & setup guide
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Food Items (`/fooditems`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/fooditems/fetch` | Seed database (first time) | No |
| GET | `/fooditems/get` | Get all food items | No |
| GET | `/fooditems/meal-type/:mealType` | Get by meal type | No |
| GET | `/fooditems/food/:id` | Get food item by ID | No |

### Orders (`/success`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/success/order` | Create new order | Yes |
| GET | `/success/orders` | Get user's orders | Yes |
| GET | `/success/order/:id` | Get specific order | Yes |
| PATCH | `/success/order/:id/status` | Update order status (Admin) | Yes (Admin) |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

## 🔒 Security Features

- ✅ **Authentication**: JWT tokens with HTTP-only cookies (prevents XSS)
- ✅ **Authorization**: Role-based access control (User/Admin)
- ✅ **Password Security**: bcrypt hashing with 12 rounds
- ✅ **Password Validation**: Minimum 8 chars, uppercase, lowercase, number
- ✅ **Rate Limiting**: 100 req/15min (general), 5 req/15min (auth)
- ✅ **Input Validation**: All inputs validated and sanitized
- ✅ **NoSQL Injection Protection**: Mongoose schema validation
- ✅ **XSS Protection**: Helmet security headers
- ✅ **CORS**: Configured for specific origins only
- ✅ **Environment Variables**: No hardcoded secrets
- ✅ **Error Handling**: No sensitive data leakage in responses

## 📊 Database Schema

### User Model
- `name` - User's full name
- `email` - Unique email (indexed)
- `password` - Hashed password (not returned in responses)
- `role` - User role (user/admin)
- `timestamps` - Created and updated timestamps

### Food Item Model
- `id` - Unique food item ID
- `name` - Food name
- `ingredients` - Array of ingredients
- `prepTimeMinutes` - Preparation time
- `cookTimeMinutes` - Cooking time
- `servings` - Number of servings
- `difficulty` - Easy/Medium/Hard
- `cuisine` - Cuisine type
- `caloriesPerServing` - Nutritional info
- `tags` - Search tags
- `image` - Image URL
- `rating` - Average rating
- `mealType` - Category (Breakfast, Lunch, etc.)
- `customizations` - Available customizations

### Order Model
- `userId` - Reference to user (indexed)
- `items` - Array of ordered items with quantities
- `totalAmount` - Order total
- `deliveryAddress` - Delivery details
- `paymentMethod` - Payment type
- `status` - Order status (indexed)
- `orderDate` - Timestamp (indexed)

## 👨‍💼 Default Admin Credentials

After seeding the database, you can log in as admin:

- **Email:** `admin@gmail.com`
- **Password:** `Admin1234`
- **Role:** admin

## 🎨 Design System

The application follows a consistent design system:

- **Color Palette**: Orange (#f97316) → Pink (#ec4899) → Purple (#a855f7)
- **Gradients**: `from-orange-500 to-pink-500` for primary actions
- **Typography**: Inter font family (from Tailwind defaults)
- **Spacing**: Consistent 8px grid system
- **Border Radius**: `rounded-2xl` for cards, `rounded-full` for pills
- **Shadows**: `shadow-lg` for cards, `shadow-2xl` for modals
- **Animations**: Framer Motion with spring physics

## 🚀 Getting Started

See [SETUP.md](SETUP.md) for detailed installation and configuration instructions.

Quick start:
1. Clone the repository
2. Install dependencies for both frontend and backend
3. Configure environment variables (`.env` files)
4. Seed the database with admin user and food items
5. Run backend (`npm run dev` in Backend folder)
6. Run frontend (`npm run dev` in Frontend folder)
7. Access application at `http://localhost:5173`

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SendGrid** - Email delivery service
- **MongoDB** - Database
- **Tailwind CSS** - Styling framework
- **Framer Motion** - Animation library
- **React Icons** - Icon library

---

**Built with ❤️ using the MERN Stack**

This is a production-ready application with enterprise-grade security, error handling, and best practices.
