-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create condos table
CREATE TABLE condos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    room_number VARCHAR(20),
    description TEXT,
    purchase_price DECIMAL(12,2),
    purchase_date DATE,
    seller VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condo_id UUID REFERENCES condos(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    line_id VARCHAR(50),
    rental_start DATE NOT NULL,
    rental_end DATE NOT NULL,
    deposit DECIMAL(10,2),
    monthly_rent DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rent_payments table
CREATE TABLE rent_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create income_records table
CREATE TABLE income_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condo_id UUID REFERENCES condos(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense_records table
CREATE TABLE expense_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condo_id UUID REFERENCES condos(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condo_id UUID REFERENCES condos(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_type VARCHAR(50),
    document_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_condos_user_id ON condos(user_id);
CREATE INDEX idx_tenants_condo_id ON tenants(condo_id);
CREATE INDEX idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX idx_income_records_condo_id ON income_records(condo_id);
CREATE INDEX idx_expense_records_condo_id ON expense_records(condo_id);
CREATE INDEX idx_documents_condo_id ON documents(condo_id);
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);


-- Create tenant_history table for keeping track of past tenants
CREATE TABLE tenant_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    condo_id UUID REFERENCES condos(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    line_id VARCHAR(50),
    rental_start DATE NOT NULL,
    rental_end DATE NOT NULL,
    actual_end_date DATE, -- วันที่จริงที่ย้ายออก
    deposit DECIMAL(10,2),
    monthly_rent DECIMAL(10,2) NOT NULL,
    end_reason VARCHAR(50), -- สาเหตุที่สิ้นสุดสัญญา: 'expired', 'early_termination', 'changed_tenant'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moved_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_tenant_history_condo_id ON tenant_history(condo_id);
CREATE INDEX idx_tenant_history_rental_dates ON tenant_history(rental_start, rental_end);

-- Add a status field to current tenants table to track transitions
ALTER TABLE tenants ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ending', 'ended'));
ALTER TABLE tenants ADD COLUMN end_reason VARCHAR(50);
ALTER TABLE tenants ADD COLUMN actual_end_date DATE;
ALTER TABLE tenants ADD COLUMN notes TEXT;
