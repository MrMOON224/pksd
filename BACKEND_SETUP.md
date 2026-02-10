# Backend Setup Guide

## Quick Setup (Recommended)

Since MCP Supabase integration is not available, here's the fastest way to set up your backend:

### Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your POS project
4. Click **SQL Editor** in the left sidebar

### Step 2: Execute the SQL Script

1. Click **New Query** button
2. Copy the entire content from `database/create_categories.sql`
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Installation

After running the script, verify the tables were created:

```sql
-- Check categories table
SELECT * FROM categories;

-- Check subcategories table  
SELECT * FROM subcategories;

-- Verify products table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('category_id', 'subcategory_id');
```

### Step 4: Test in Your App

1. Open `admin-dashboard.html`
2. Navigate to Products → Product Categories
3. You should see the sample categories loaded
4. Try adding/editing/deleting categories

## What the Script Does

✅ Creates `categories` table
✅ Creates `subcategories` table  
✅ Adds `category_id` and `subcategory_id` to `products` table
✅ Sets up Row Level Security policies
✅ Inserts sample data:
  - Electronics (Mobile Phones, Laptops, Accessories)
  - Groceries (Beverages, Snacks, Dairy)
  - Clothing (Men, Women, Kids)

## Troubleshooting

**Error: "relation already exists"**
- Tables are already created. You can skip the creation part or drop them first.

**Error: "permission denied"**
- Make sure you're using the Supabase service role or have admin permissions.

**Tables created but no data showing**
- Check RLS policies are enabled
- Verify your user has the admin role in `user_roles` table

## Next Steps

After successful setup, you can:
1. Manage categories through the UI
2. Integrate categories with product management
3. Add more sample data as needed
