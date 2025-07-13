import type { User, Condo, Tenant, RentPayment, IncomeRecord, ExpenseRecord, Document, TenantHistory } from "./supabase"

export const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    full_name: "John Smith",
    email: "john@example.com",
    phone: "+1234567890",
    created_at: "2024-01-01T00:00:00Z",
  },
]

export const mockCondos: Condo[] = [
  {
    id: "1",
    user_id: "1",
    name: "Sunset Towers Unit A",
    address: "123 Main Street, Downtown",
    room_number: "A-101",
    description: "Modern 2-bedroom apartment with city view",
    purchase_price: 250000,
    purchase_date: "2023-01-15",
    seller: "ABC Real Estate",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    user_id: "1",
    name: "Ocean View Condo",
    address: "456 Beach Road, Seaside",
    room_number: "B-205",
    description: "1-bedroom oceanfront condo",
    purchase_price: 180000,
    purchase_date: "2023-06-20",
    seller: "Coastal Properties",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
]

export const mockTenants: Tenant[] = [
  {
    id: "1",
    condo_id: "1",
    full_name: "Alice Johnson",
    phone: "+1234567891",
    line_id: "alice_j",
    rental_start: "2024-01-01",
    rental_end: "2024-12-31",
    deposit: 2000,
    monthly_rent: 1500,
    is_active: true,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    condo_id: "2",
    full_name: "Bob Wilson",
    phone: "+1234567892",
    line_id: "bob_w",
    rental_start: "2024-02-01",
    rental_end: "2025-01-31",
    deposit: 1500,
    monthly_rent: 1200,
    is_active: true,
    status: "active",
    created_at: "2024-02-01T00:00:00Z",
  },
]

export const mockRentPayments: RentPayment[] = [
  {
    id: "1",
    tenant_id: "1",
    amount: 1500,
    due_date: "2024-01-01",
    paid_date: "2024-01-01",
    status: "paid",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    tenant_id: "1",
    amount: 1500,
    due_date: "2024-02-01",
    paid_date: "2024-02-01",
    status: "paid",
    created_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "3",
    tenant_id: "1",
    amount: 1500,
    due_date: "2024-03-01",
    status: "unpaid",
    created_at: "2024-03-01T00:00:00Z",
  },
  {
    id: "4",
    tenant_id: "2",
    amount: 1200,
    due_date: "2024-02-01",
    paid_date: "2024-02-01",
    status: "paid",
    created_at: "2024-02-01T00:00:00Z",
  },
]

export const mockIncomeRecords: IncomeRecord[] = [
  {
    id: "1",
    condo_id: "1",
    type: "Rent",
    amount: 1500,
    date: "2024-01-01",
    description: "Monthly rent payment",
    category: "Rental Income",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    condo_id: "1",
    type: "Parking Fee",
    amount: 100,
    date: "2024-01-01",
    description: "Monthly parking fee",
    category: "Additional Income",
    created_at: "2024-01-01T00:00:00Z",
  },
]

export const mockExpenseRecords: ExpenseRecord[] = [
  {
    id: "1",
    condo_id: "1",
    type: "Maintenance",
    amount: 200,
    date: "2024-01-15",
    description: "HVAC maintenance",
    category: "Maintenance",
    created_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    condo_id: "2",
    type: "Utilities",
    amount: 150,
    date: "2024-01-01",
    description: "Water and electricity",
    category: "Utilities",
    created_at: "2024-01-01T00:00:00Z",
  },
]

export const mockDocuments: Document[] = [
  {
    id: "1",
    condo_id: "1",
    name: "Purchase Contract",
    file_url: "/documents/purchase-contract-1.pdf",
    file_type: "pdf",
    document_type: "contract",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    tenant_id: "1",
    name: "Rental Agreement",
    file_url: "/documents/rental-agreement-1.pdf",
    file_type: "pdf",
    document_type: "rental",
    created_at: "2024-01-01T00:00:00Z",
  },
]

export const mockTenantHistory: TenantHistory[] = [
  {
    id: "1",
    condo_id: "1",
    full_name: "สมชาย ใจดี",
    phone: "+66812345678",
    line_id: "somchai_jaidee",
    rental_start: "2023-01-01",
    rental_end: "2023-12-31",
    actual_end_date: "2023-12-31",
    deposit: 2000,
    monthly_rent: 1400,
    end_reason: "expired",
    notes: "ผู้เช่าดี จ่ายค่าเช่าตรงเวลา สิ้นสุดสัญญาตามกำหนด",
    created_at: "2023-01-01T00:00:00Z",
    moved_out_at: "2023-12-31T00:00:00Z",
  },
  {
    id: "2",
    condo_id: "2",
    full_name: "สมหญิง รักสะอาด",
    phone: "+66823456789",
    line_id: "somying_clean",
    rental_start: "2023-06-01",
    rental_end: "2024-05-31",
    actual_end_date: "2024-01-15",
    deposit: 1500,
    monthly_rent: 1100,
    end_reason: "early_termination",
    notes: "ย้ายออกก่อนกำหนดเนื่องจากย้ายงาน คืนเงินประกันแล้ว",
    created_at: "2023-06-01T00:00:00Z",
    moved_out_at: "2024-01-15T00:00:00Z",
  },
]
