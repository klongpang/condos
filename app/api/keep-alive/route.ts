import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force the route to be dynamic to ensure it always hits the database
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Perform a lightweight query to ensure the DB is active
    // Using head: true and count: 'exact' to minimize data transfer
    const { count, error } = await supabase
      .from('condos')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Supabase Keep-Alive Error:', error)
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to connect to Supabase',
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase is active',
      timestamp: new Date().toISOString(),
      metrics: {
        table: 'condos',
        count: count,
      },
    })
  } catch (error: any) {
    console.error('Supabase Keep-Alive Exception:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal Server Error',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
