# arios-cafe E-commerce Platform

A comprehensive e-commerce platform with admin panel, user website, and delivery boy panel. Built with Node.js, Express, MongoDB, and React.

## Features

### Admin Panel ✅
- **Product Management**: CRUD operations with multiple image upload
- **Order Management**: View all orders with status filtering
- **User Management**: Customer account management
- **Delivery Boy Management**: Assign and track delivery personnel
- **Dashboard**: Analytics and statistics
- **Modern UI**: Clean, responsive design inspired by modern e-commerce platforms

### User Website (Coming Soon)
- Browse/search/filter products
- Add to cart and edit quantities
- Checkout with payment simulation
- Order history and tracking
- Product reviews and ratings

### Delivery Boy Panel (Coming Soon)
- Login to view assigned orders
- Update order status (picked up, en route, delivered)
- View delivery address and customer contact

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Multer** - File upload handling
- **Cloudinary** - Image storage
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Icons** - Icon library
- **React Hot Toast** - Notifications
- **Chart.js** - Data visualization
- **CSS3** - Styling with custom design system

## Project Structure

```
arios-cafe/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── package.json
├── models/                 # MongoDB models
├── routes/                 # API routes
├── middleware/             # Custom middleware
├── server.js              # Express server
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arios-cafe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/arios-cafe
   JWT_SECRET=your-super-secret-jwt-key
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

The admin panel will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - User registration
- `GET /api/auth/user` - Get current user

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/products` - Get all products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/users` - Get all users
- `GET /api/admin/delivery-boys` - Get all delivery boys

### Public Routes
- `GET /api/products` - Get products (public)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/categories` - Get categories
- `GET /api/products/brands` - Get brands

## Database Models

### Product
- name, description, price, originalPrice
- category, brand, images[]
- stock, rating, numReviews
- isActive, featured, tags[]

### Order
- user, items[], deliveryAddress
- deliveryBoy, status, paymentStatus
- subtotal, deliveryFee, tax, total
- estimatedDelivery, actualDelivery

### User
- name, email, password, phone
- role (user/admin/delivery)
- addresses[], preferences
- isActive, emailVerified

### DeliveryBoy
- name, email, password, phone
- vehicleNumber, vehicleType
- status, currentLocation
- rating, earnings, documents

## Demo Credentials

**Admin Login:**
- Email: arioscafe@gmail.com
- Password: arioscafe

## Features Implemented

### ✅ Completed
- [x] Backend API with full CRUD operations
- [x] Authentication system with JWT
- [x] Admin panel with modern UI
- [x] Dashboard with statistics and charts
- [x] Product management (list, search, delete)
- [x] Responsive design
- [x] Image upload with Cloudinary
- [x] Database models and relationships

### 🚧 In Progress
- [ ] Product form (create/edit)
- [ ] Order management
- [ ] User management
- [ ] Delivery boy management

### 📋 Planned
- [ ] User website
- [ ] Delivery boy panel
- [ ] Payment integration
- [ ] Email notifications
- [ ] Real-time updates
- [ ] Mobile app

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository. 