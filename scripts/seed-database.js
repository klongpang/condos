const { createClient } = require("@supabase/supabase-js")

// Load environment variables
require("dotenv").config({ path: ".env.local" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...")

    // Create demo user
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([
        {
          username: "admin",
          password_hash: "hashed_password", // In production, hash this properly
          full_name: "ผู้ดูแลระบบ",
          email: "admin@example.com",
          phone: "+66812345678",
        },
      ])
      .select()
      .single()

    if (userError) {
      console.error("❌ Error creating user:", userError)
      return
    }

    console.log("✅ Demo user created")

    // Create demo condos
    const { data: condos, error: condoError } = await supabase
      .from("condos")
      .insert([
        {
          user_id: user.id,
          name: "Sunset Towers Unit A",
          address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
          room_number: "A-101",
          description: "คอนโดมิเนียม 2 ห้องนอน วิวเมือง",
          purchase_price: 2500000,
          purchase_date: "2023-01-15",
          seller: "บริษัท ABC อสังหาริมทรัพย์",
        },
        {
          user_id: user.id,
          name: "Ocean View Condo",
          address: "456 ถนนสุขุมวิท แขวงพระโขนง เขตวัฒนา กรุงเทพฯ 10110",
          room_number: "B-205",
          description: "คอนโดมิเนียม 1 ห้องนอน วิวทะเล",
          purchase_price: 1800000,
          purchase_date: "2023-06-20",
          seller: "บริษัท XYZ พร็อพเพอร์ตี้",
        },
      ])
      .select()

    if (condoError) {
      console.error("❌ Error creating condos:", condoError)
      return
    }

    console.log("✅ Demo condos created")

    // Create demo tenants
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .insert([
        {
          condo_id: condos[0].id,
          full_name: "สมชาย ใจดี",
          phone: "+66812345678",
          line_id: "somchai_jaidee",
          rental_start: "2024-01-01",
          rental_end: "2024-12-31",
          deposit: 30000,
          monthly_rent: 15000,
          status: "active",
        },
        {
          condo_id: condos[1].id,
          full_name: "สมหญิง รักสะอาด",
          phone: "+66823456789",
          line_id: "somying_clean",
          rental_start: "2024-02-01",
          rental_end: "2025-01-31",
          deposit: 24000,
          monthly_rent: 12000,
          status: "active",
        },
      ])
      .select()

    if (tenantError) {
      console.error("❌ Error creating tenants:", tenantError)
      return
    }

    console.log("✅ Demo tenants created")

    // Create demo rent payments
    const { error: paymentError } = await supabase.from("rent_payments").insert([
      {
        tenant_id: tenants[0].id,
        amount: 15000,
        due_date: "2024-01-01",
        paid_date: "2024-01-01",
        status: "paid",
      },
      {
        tenant_id: tenants[0].id,
        amount: 15000,
        due_date: "2024-02-01",
        paid_date: "2024-02-01",
        status: "paid",
      },
      {
        tenant_id: tenants[0].id,
        amount: 15000,
        due_date: "2024-03-01",
        status: "unpaid",
      },
      {
        tenant_id: tenants[1].id,
        amount: 12000,
        due_date: "2024-02-01",
        paid_date: "2024-02-01",
        status: "paid",
      },
    ])

    if (paymentError) {
      console.error("❌ Error creating payments:", paymentError)
      return
    }

    console.log("✅ Demo payments created")

    console.log("🎉 Database seeding completed!")
    console.log("📋 Demo credentials:")
    console.log("   Username: admin")
    console.log("   Password: password")
  } catch (error) {
    console.error("❌ Database seeding failed:", error)
    process.exit(1)
  }
}

seedDatabase()
