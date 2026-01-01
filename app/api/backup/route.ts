import { NextRequest, NextResponse } from "next/server";
import {
  createAndUploadBackup,
  listBackups,
  cleanupOldBackups,
  sendBackupEmail,
  exportAllTables,
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
 * - include_storage: If "false", skip storage files (default: true)
 * - send_email: If "true", send backup via email (default: false)
 * - email_only: If "true", only send email without uploading to storage
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
    const includeStorage = request.nextUrl.searchParams.get("include_storage") !== "false";
    const sendEmail = request.nextUrl.searchParams.get("send_email") === "true";
    const emailOnly = request.nextUrl.searchParams.get("email_only") === "true";
    
    console.log(`Starting backup process... (includeStorage: ${includeStorage}, sendEmail: ${sendEmail}, emailOnly: ${emailOnly})`);

    // Email only mode - just export and send email
    if (emailOnly) {
      console.log("[Backup] Email-only mode...");
      const tableData = await exportAllTables();
      
      let totalRecords = 0;
      for (const table of Object.keys(tableData)) {
        totalRecords += tableData[table].length;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${timestamp}.json`;
      
      const backupData = {
        timestamp: new Date().toISOString(),
        tables: tableData,
        meta: { totalRecords, tableCount: Object.keys(tableData).length }
      };
      
      const buffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
      const stats = {
        tables: Object.keys(tableData).length,
        totalRecords,
        files: 0,
        sizeBytes: buffer.length,
      };

      const emailResult = await sendBackupEmail(buffer, filename, stats);

      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: "Backup sent via email",
          filename,
          stats,
          emailSent: true,
        });
      } else {
        return NextResponse.json(
          { success: false, error: emailResult.error },
          { status: 500 }
        );
      }
    }

    // Normal backup (with optional email)
    const result = await createAndUploadBackup({ includeStorage });

    if (result.success) {
      const cleanedUp = await cleanupOldBackups(7);
      
      let emailSent = false;
      let emailError: string | undefined;

      // Send email if requested
      if (sendEmail && result.stats) {
        // For email, we need to get the file content
        // Since we just created the backup, export tables again for email
        const tableData = await exportAllTables();
        const backupData = {
          timestamp: new Date().toISOString(),
          tables: tableData,
          meta: result.stats
        };
        const buffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
        const emailFilename = result.filename?.replace('.zip', '.json') || 'backup.json';
        
        const emailResult = await sendBackupEmail(buffer, emailFilename, result.stats);
        emailSent = emailResult.success;
        emailError = emailResult.error;
      }
      
      return NextResponse.json({
        success: true,
        message: "Backup completed successfully",
        filename: result.filename,
        downloadUrl: result.url,
        stats: result.stats,
        cleanedUp: cleanedUp > 0 ? `Deleted ${cleanedUp} old backup(s)` : undefined,
        emailSent: sendEmail ? emailSent : undefined,
        emailError: emailError,
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
