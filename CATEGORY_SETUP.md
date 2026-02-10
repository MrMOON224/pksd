# Category Management Setup Instructions

## Step 1: Run Database Migration

You need to create the categories and subcategories tables in your Supabase database.

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Open the file `database/create_categories.sql`
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the script

This will create:
- `categories` table (main categories)
- `subcategories` table (linked to categories)
- Add `category_id` and `subcategory_id` columns to products table
- Set up Row Level Security (RLS) policies
- Insert sample data (Electronics, Groceries, Clothing with subcategories)

## Step 2: Access Category Management

1. Open `admin-dashboard.html`
2. Click on **Products** in the sidebar to expand the menu
3. Click on **Product Categories**

## Features

### Main Categories Tab
- View all main categories
- Add new categories
- Edit category names and descriptions
- Delete categories (will also delete associated subcategories)
- Bulk save all changes

### Subcategories Tab
- View all subcategories linked to main categories
- Add new subcategories
- Select parent category from dropdown
- Edit names and descriptions
- Delete subcategories
- Bulk save all changes

## Next Steps

To integrate categories with the product grid, you'll need to:
1. Add category/subcategory dropdown columns to the product table
2. Fetch categories from the database for the dropdowns
3. Update product save logic to include category/subcategory IDs

This integration is currently marked as pending in task.md.
