import { NextRequest, NextResponse } from "next/server";
import { checkAndGenerateNotifications } from "@/lib/notifications";

/**
 * API endpoint สำหรับตรวจสอบและสร้าง notifications
 * ใช้กับ cron-job.org หรือ Vercel Cron
 * 
 * GET /api/notifications/check
 * 
 * Headers:
 *   Authorization: Bearer <CRON_SECRET> (optional, for security)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized request");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting notification check...");
    const startTime = Date.now();

    const result = await checkAndGenerateNotifications();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Completed in ${duration}ms`, result);

    return NextResponse.json({
      success: result.success,
      message: `Created ${result.created} notifications, sent ${result.emailsSent} emails`,
      data: {
        created: result.created,
        emailsSent: result.emailsSent,
        errors: result.errors,
        duration: `${duration}ms`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
