# POS System

A modern Point of Sale system with role-based authentication built with vanilla HTML/CSS/JavaScript and Supabase.

## Features

- 🔐 **Secure Authentication** - Supabase Auth with role-based access control
- 👥 **Multi-Role Support** - Admin, Cashier, and Manager roles
- 💳 **POS Interface** - Fast and intuitive sales processing
- 📊 **Analytics Dashboard** - Real-time sales insights
- 🎨 **Premium UI** - Glassmorphism design with smooth animations
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (ES6)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: GitHub Pages compatible
- **Icons**: Font Awesome
- **Fonts**: Inter (Google Fonts)

## Setup Instructions

### 1. Supabase Configuration

The project is already configured with Supabase. The credentials are in `config.js`.

### 2. Create Admin User

**IMPORTANT**: You need to create the admin user through Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **pos** (`jjjdzpmxyifubbnvktwn`)
3. Go to **Authentication** → **Users**
4. Click **Add User** → **Create new user**
5. Enter:
   - Email: `admin@gmail.com`
   - Password: `admin123@`
   - Confirm password: `admin123@`
6. Click **Create user**

### 3. Assign Admin Role

After creating the user, assign the admin role:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace `USER_ID` with the actual user ID from step 2):

```sql
-- Get the user ID first
SELECT id, email FROM auth.users WHERE email = 'admin@gmail.com';

-- Then insert the role (replace 'USER_ID_HERE' with actual ID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');
```

### 4. Add Sample Products (Optional)

```sql
INSERT INTO public.products (name, description, price, category, stock) VALUES
('Coca Cola', 'Refreshing soft drink 330ml', 1.50, 'Beverages', 100),
('Pepsi', 'Classic cola drink 330ml', 1.50, 'Beverages', 80),
('Water Bottle', 'Pure mineral water 500ml', 0.75, 'Beverages', 150),
('Chips', 'Potato chips original flavor', 2.00, 'Snacks', 60),
('Chocolate Bar', 'Milk chocolate 100g', 1.25, 'Snacks', 75),
('Sandwich', 'Fresh chicken sandwich', 4.50, 'Food', 30),
('Coffee', 'Hot brewed coffee', 2.50, 'Beverages', 50),
('Energy Drink', 'Energy boost drink 250ml', 3.00, 'Beverages', 40);
```

## Running Locally

### Option 1: Direct File Access
Simply open `index.html` in your web browser.

### Option 2: Local Server (Recommended)
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server -p 8000

# Then visit: http://localhost:8000
```

## Login Credentials

- **Email**: admin@gmail.com
- **Password**: admin123@

## User Roles

### Admin
- Full system access
- User management
- Product management
- View all transactions
- System configuration

### Cashier
- POS interface only
- Process sales
- View own transactions

### Manager
- Analytics dashboard
- View all transactions
- Generate reports
- No product/user management

## Deployment to GitHub Pages

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial POS system"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/pos-system.git
git branch -M main
git push -u origin main

# Enable GitHub Pages
# Go to: Settings → Pages → Source: main branch
# Your site will be live at: https://yourusername.github.io/pos-system/
```

## Project Structure

```
pos-system/
├── index.html              # Login page (entry point)
├── admin-dashboard.html    # Admin dashboard
├── cashier-pos.html        # Cashier POS (coming soon)
├── manager-dashboard.html  # Manager dashboard (coming soon)
├── config.js               # Supabase configuration
├── css/
│   ├── styles.css         # Main design system
│   ├── auth.css           # Authentication styles
│   └── dashboard.css      # Dashboard styles
├── js/
│   ├── supabase-client.js # Supabase initialization
│   └── auth.js            # Authentication logic
└── README.md              # This file
```

## Database Schema

### user_roles
- `id`: UUID (primary key)
- `user_id`: UUID (references auth.users)
- `role`: TEXT (admin, cashier, manager)
- `created_at`: TIMESTAMP

### products
- `id`: UUID (primary key)
- `name`: TEXT
- `description`: TEXT
- `price`: DECIMAL
- `category`: TEXT
- `image_url`: TEXT
- `stock`: INTEGER
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### transactions
- `id`: UUID (primary key)
- `user_id`: UUID (references auth.users)
- `total`: DECIMAL
- `payment_method`: TEXT
- `status`: TEXT
- `created_at`: TIMESTAMP

### transaction_items
- `id`: UUID (primary key)
- `transaction_id`: UUID (references transactions)
- `product_id`: UUID (references products)
- `product_name`: TEXT
- `quantity`: INTEGER
- `price`: DECIMAL
- `subtotal`: DECIMAL

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure authentication with Supabase Auth
- Password hashing handled by Supabase

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License

## Support

For issues or questions, please contact the administrator.
