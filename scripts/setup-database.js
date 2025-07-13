const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

// Load environment variables
require("dotenv").config({ path: ".env.local" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function setupDatabase() {
  try {
    console.log("🚀 Setting up database...")

    // Read and execute SQL files
    const sqlFiles = ["scripts/01-create-tables.sql", "scripts/02-add-tenant-history.sql"]

    for (const sqlFile of sqlFiles) {
      console.log(`📄 Executing ${sqlFile}...`)
      const sqlContent = fs.readFileSync(path.join(process.cwd(), sqlFile), "utf8")

      // Split by semicolon and execute each statement
      const statements = sqlContent.split(";").filter((stmt) => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc("exec_sql", { sql: statement.trim() })
          if (error) {
            console.error(`❌ Error executing statement: ${error.message}`)
          }
        }
      }
    }

    console.log("✅ Database setup completed!")
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

setupDatabase()
