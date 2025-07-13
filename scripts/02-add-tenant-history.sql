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
