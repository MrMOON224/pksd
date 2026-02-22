-- Supabase Schema Export for project: pos
-- Generated via MCP Supabase Server

-- 1. roles
CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. user_roles
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid UNIQUE, -- References auth.users(id)
    role text CHECK (role = ANY (ARRAY['admin'::text, 'cashier'::text, 'manager'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. categories
CREATE TABLE public.categories (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. subcategories
CREATE TABLE public.subcategories (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    category_id uuid REFERENCES public.categories(id),
    name text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. brands
CREATE TABLE public.brands (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE,
    description text,
    website text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 6. units
CREATE TABLE public.units (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE,
    short_name text,
    allow_decimals boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. products
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    description text,
    price numeric CHECK (price >= 0::numeric),
    category text,
    image_url text,
    stock integer DEFAULT 0 CHECK (stock >= 0),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    code text,
    brand text,
    cost numeric DEFAULT 0,
    unit text,
    category_id uuid REFERENCES public.categories(id),
    subcategory_id uuid REFERENCES public.subcategories(id),
    brand_id uuid REFERENCES public.brands(id),
    unit_id uuid REFERENCES public.units(id),
    item_code text UNIQUE,
    barcodes _text DEFAULT '{}'::text[],
    pcs_per_box integer DEFAULT 1,
    supplier text,
    shop text,
    purchase_unit text,
    sale_unit text,
    discount numeric DEFAULT 0,
    box_price numeric DEFAULT 0,
    remark text
);

-- 8. variation_types
CREATE TABLE public.variation_types (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 9. variation_options
CREATE TABLE public.variation_options (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    variation_type_id uuid REFERENCES public.variation_types(id),
    option_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 10. product_variations
CREATE TABLE public.product_variations (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id),
    variation_option_id uuid REFERENCES public.variation_options(id),
    sku text,
    price_adjustment numeric DEFAULT 0,
    stock integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. customers
CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    company_name text,
    email text,
    phone text,
    address text,
    tax_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dob date,
    country text,
    city text
);

-- 12. warehouses
CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    code text UNIQUE,
    phone text,
    email text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    country text,
    city text,
    zip_code text
);

-- 13. transactions
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid, -- References auth.users(id)
    total numeric CHECK (total >= 0::numeric),
    payment_method text,
    status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['completed'::text, 'cancelled'::text, 'refunded'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    remark text,
    paid_amount numeric DEFAULT 0,
    payment_status text DEFAULT 'completed'::text,
    voucher_no text,
    warehouse_id uuid REFERENCES public.warehouses(id),
    customer_id uuid REFERENCES public.customers(id),
    counter text,
    table_no text,
    tax_amount numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    shipping_amount numeric DEFAULT 0,
    discount_type text DEFAULT 'cash'::text CHECK (discount_type = ANY (ARRAY['percent'::text, 'cash'::text])),
    payment_details jsonb DEFAULT '[]'::jsonb,
    cashier text,
    shop text,
    customer_name text,
    tax_percent numeric DEFAULT 0,
    discount_value numeric DEFAULT 0,
    subtotal numeric DEFAULT 0,
    total_amount numeric DEFAULT 0,
    refund_amount numeric DEFAULT 0,
    items jsonb DEFAULT '[]'::jsonb,
    transaction_status text
);

-- 14. transaction_items
CREATE TABLE public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid REFERENCES public.transactions(id),
    product_id uuid REFERENCES public.products(id),
    product_name text,
    quantity integer CHECK (quantity > 0),
    price numeric CHECK (price >= 0::numeric),
    subtotal numeric CHECK (subtotal >= 0::numeric),
    discount numeric DEFAULT 0
);

-- 15. suppliers
CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    company_name text,
    email text,
    phone text,
    address text,
    tax_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dob date,
    country text,
    city text
);

-- 16. purchases
CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date DEFAULT CURRENT_DATE,
    reference_no text UNIQUE,
    supplier_id uuid REFERENCES public.suppliers(id),
    warehouse_id uuid REFERENCES public.warehouses(id),
    status text DEFAULT 'Received'::text,
    payment_status text DEFAULT 'Unpaid'::text,
    payment_type text,
    total_qty numeric DEFAULT 0,
    order_tax_percentage numeric DEFAULT 0,
    order_tax_amount numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    shipping_amount numeric DEFAULT 0,
    grand_total numeric DEFAULT 0,
    paid_amount numeric DEFAULT 0,
    note text,
    created_by uuid, -- References auth.users(id)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shipping_method text,
    priority text DEFAULT 'Normal'::text,
    agent_name text,
    instructions text,
    expected_delivery date,
    reference_no_ext text
);

-- 17. purchase_items
CREATE TABLE public.purchase_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id uuid REFERENCES public.purchases(id),
    product_id uuid REFERENCES public.products(id),
    quantity numeric,
    unit_cost numeric,
    discount_amount numeric DEFAULT 0,
    tax_percentage numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    subtotal numeric,
    created_at timestamp with time zone DEFAULT now(),
    pcs_box text,
    remark text
);

-- 18. purchase_returns
CREATE TABLE public.purchase_returns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date DEFAULT CURRENT_DATE,
    reference_no text UNIQUE,
    purchase_id uuid REFERENCES public.purchases(id),
    supplier_id uuid REFERENCES public.suppliers(id),
    warehouse_id uuid REFERENCES public.warehouses(id),
    status text DEFAULT 'Completed'::text,
    payment_status text DEFAULT 'Paid'::text,
    grand_total numeric DEFAULT 0,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 19. purchase_return_items
CREATE TABLE public.purchase_return_items (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    return_id uuid REFERENCES public.purchase_returns(id),
    product_id uuid REFERENCES public.products(id),
    quantity numeric,
    unit_price numeric,
    total numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 20. adjustments
CREATE TABLE public.adjustments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id),
    type text,
    quantity integer,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    cost numeric DEFAULT 0,
    amount numeric DEFAULT 0,
    remark text
);

-- 21. transfers
CREATE TABLE public.transfers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date DEFAULT CURRENT_DATE,
    from_warehouse_id uuid REFERENCES public.warehouses(id),
    to_warehouse_id uuid REFERENCES public.warehouses(id),
    total_qty numeric DEFAULT 0,
    grand_total numeric DEFAULT 0,
    remark text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 22. transfer_items
CREATE TABLE public.transfer_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_id uuid REFERENCES public.transfers(id),
    product_id uuid REFERENCES public.products(id),
    quantity numeric DEFAULT 0,
    unit_cost numeric DEFAULT 0,
    subtotal numeric DEFAULT 0,
    remark text,
    created_at timestamp with time zone DEFAULT now()
);

-- 23. expense_categories
CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 24. expenses
CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date DEFAULT CURRENT_DATE,
    category_id uuid REFERENCES public.expense_categories(id),
    item text,
    amount numeric DEFAULT 0,
    payment_method text,
    remark text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    warehouse_id uuid REFERENCES public.warehouses(id),
    reference_no text
);

-- 25. currencies
CREATE TABLE public.currencies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE,
    name text,
    symbol text,
    exchange_rate numeric DEFAULT 1,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 26. languages
CREATE TABLE public.languages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE,
    name text,
    flag text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 27. settings
CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name text,
    store_address text,
    store_phone text,
    store_email text,
    store_logo text,
    tax_rate numeric DEFAULT 0,
    currency_symbol text DEFAULT '$'::text,
    updated_at timestamp with time zone DEFAULT now(),
    default_currency text,
    default_email text,
    currency_icon_right boolean DEFAULT false,
    footer text,
    default_customer text DEFAULT 'walk-in-customer'::text,
    default_warehouse uuid,
    country text,
    state text,
    city text,
    postal_code text,
    date_format text DEFAULT 'YYYY-MM-DD'::text,
    developed_by text,
    purchase_prefix text DEFAULT 'PU'::text,
    purchase_return_prefix text DEFAULT 'PR'::text,
    sales_prefix text DEFAULT 'SA'::text,
    sales_return_prefix text DEFAULT 'SR'::text,
    expense_prefix text DEFAULT 'EX'::text,
    mail_mailer text DEFAULT 'smtp'::text,
    mail_host text,
    mail_port text DEFAULT '1025'::text,
    sender_name text,
    mail_username text,
    mail_password text,
    mail_encryption text,
    show_note boolean DEFAULT true,
    show_phone boolean DEFAULT true,
    show_customer boolean DEFAULT true,
    show_address boolean DEFAULT true,
    show_email boolean DEFAULT false,
    show_tax_discount boolean DEFAULT true,
    show_barcode boolean DEFAULT true,
    show_logo_payment boolean DEFAULT false,
    show_product_code boolean DEFAULT false,
    receipt_note text
);

-- 28. sms_templates
CREATE TABLE public.sms_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 29. email_templates
CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    subject text,
    body text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 30. api_settings
CREATE TABLE public.api_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sms_provider text,
    sms_api_key text,
    sms_api_secret text,
    sms_sender_id text,
    payment_gateway text,
    payment_public_key text,
    payment_secret_key text,
    webhook_url text DEFAULT 'https://yourapp.com/api/webhook'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 31. quotations
CREATE TABLE public.quotations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date DEFAULT CURRENT_DATE,
    reference_no text UNIQUE,
    customer_id uuid REFERENCES public.customers(id),
    warehouse_id uuid REFERENCES public.warehouses(id),
    status text DEFAULT 'Sent'::text,
    total_qty numeric DEFAULT 0,
    order_tax_percentage numeric DEFAULT 0,
    order_tax_amount numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    shipping_amount numeric DEFAULT 0,
    grand_total numeric DEFAULT 0,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 32. quotation_items
CREATE TABLE public.quotation_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id uuid REFERENCES public.quotations(id),
    product_id uuid REFERENCES public.products(id),
    net_unit_price numeric DEFAULT 0,
    stock numeric DEFAULT 0,
    unit text,
    quantity numeric DEFAULT 1,
    discount_amount numeric DEFAULT 0,
    tax_percentage numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    subtotal numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 33. payment_methods
CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
