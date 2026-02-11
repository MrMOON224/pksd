-- =============================================
-- Fix Products Table ID Constraint
-- =============================================

-- This script ensures that the products table has a proper UUID primary key
-- with a default value. This prevents the "null value in column id" error
-- when inserting new products from the dashboard.

DO $$ 
BEGIN
    -- 1. Ensure id column has uuid_generate_v4() default if it's a UUID
    -- This assumes your table uses UUIDs. If it uses serial integers, 
    -- Supabase usually handles that automatically, so 23502 errors 
    -- often indicate it's a UUID column missing its default.
    
    ALTER TABLE public.products 
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set default. Ensure the uuid-ossp extension is enabled or the column is compatible.';
END $$;

-- Verify the change
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'id';
