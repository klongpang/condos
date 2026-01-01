import { NextRequest, NextResponse } from "next/server";
import {
  createAndUploadBackup,
  listBackups,
  cleanupOldBackups,
} from "@/lib/backup";

// Secret key for API authorization
const BACKUP_SECRET_KEY = process.env.BACKUP_SECRET_KEY;

/**
 * GET /api/backup
 * Trigger a backup and return the result
 * 
 * Query params:
 * - secret_key: Required for authorization
 * - list: If "true", returns list of existing backups
 * - cleanup: If "true", deletes old backups (keeps latest 7)
 */
export async function GET(request: NextRequest) {
  // Check authorization
  const secretKey = request.nextUrl.searchParams.get("secret_key");
  
  if (!BACKUP_SECRET_KEY) {
    return NextResponse.json(
      { error: "Backup is not configured. Please set BACKUP_SECRET_KEY." },
      { status: 500 }
    );
  }

  if (secretKey !== BACKUP_SECRET_KEY) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid or missing secret_key." },
      { status: 401 }
    );
  }

  // Check for list action
  const listAction = request.nextUrl.searchParams.get("list");
  if (listAction === "true") {
    const backups = await listBackups();
    return NextResponse.json({ backups });
  }

  // Check for cleanup action
  const cleanupAction = request.nextUrl.searchParams.get("cleanup");
  if (cleanupAction === "true") {
    const deleted = await cleanupOldBackups(7);
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${deleted} old backup(s)` 
    });
  }

  // Perform backup
  try {
    // Check if storage backup should be included
    const includeStorage = request.nextUrl.searchParams.get("include_storage") !== "false";
    
    console.log(`Starting backup process... (includeStorage: ${includeStorage})`);
    const result = await createAndUploadBackup({ includeStorage });

    if (result.success) {
      // Optionally cleanup old backups after successful backup
      const cleanedUp = await cleanupOldBackups(7);
      
      return NextResponse.json({
        success: true,
        message: "Backup completed successfully",
        filename: result.filename,
        downloadUrl: result.url,
        stats: result.stats,
        cleanedUp: cleanedUp > 0 ? `Deleted ${cleanedUp} old backup(s)` : undefined,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Prevent timeout for long-running backups
export const maxDuration = 300; // 5 minutes (Vercel Pro limit)
export const dynamic = "force-dynamic";
