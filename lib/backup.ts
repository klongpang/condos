import { supabaseAdmin } from "./supabase";
import type {
  User,
  Condo,
  Tenant,
  RentPayment,
  IncomeRecord,
  ExpenseRecord,
  TenantHistory,
  Document,
  Notification,
} from "./supabase";
import archiver from "archiver";
import { Readable, PassThrough } from "stream";

// Storage buckets to backup
const STORAGE_BUCKETS = ["documents", "receipts", "profiles"];

// Tables to export
const TABLES = [
  "users",
  "condos",
  "tenants",
  "rent_payments",
  "income",
  "expense",
  "tenant_history",
  "documents",
  "notifications",
];

export interface BackupResult {
  success: boolean;
  filename?: string;
  url?: string;
  error?: string;
  stats?: {
    tables: number;
    totalRecords: number;
    files: number;
    sizeBytes: number;
  };
}

export interface BackupOptions {
  includeStorage?: boolean; // default: true
}

interface TableData {
  [key: string]: unknown[];
}

/**
 * Export all database tables to JSON
 */
export async function exportAllTables(): Promise<TableData> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not available");
  }

  const data: TableData = {};

  for (const table of TABLES) {
    try {
      const { data: tableData, error } = await supabaseAdmin
        .from(table)
        .select("*");

      if (error) {
        console.error(`Error exporting table ${table}:`, error);
        data[table] = [];
      } else {
        data[table] = tableData || [];
      }
    } catch (err) {
      console.error(`Failed to export table ${table}:`, err);
      data[table] = [];
    }
  }

  return data;
}

/**
 * Get list of all files in storage buckets
 */
export async function listStorageFiles(): Promise<
  { bucket: string; path: string }[]
> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client not available");
  }

  const files: { bucket: string; path: string }[] = [];

  for (const bucket of STORAGE_BUCKETS) {
    try {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list("", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        console.error(`Error listing bucket ${bucket}:`, error);
        continue;
      }

      if (data) {
        // Recursively list folders
        for (const item of data) {
          if (item.id) {
            // It's a file
            files.push({ bucket, path: item.name });
          } else {
            // It's a folder, list its contents
            const folderFiles = await listFolderRecursive(bucket, item.name);
            files.push(...folderFiles);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to list bucket ${bucket}:`, err);
    }
  }

  return files;
}

/**
 * Recursively list files in a folder
 */
async function listFolderRecursive(
  bucket: string,
  folderPath: string
): Promise<{ bucket: string; path: string }[]> {
  if (!supabaseAdmin) return [];

  const files: { bucket: string; path: string }[] = [];

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folderPath, {
        limit: 1000,
      });

    if (error || !data) return files;

    for (const item of data) {
      const fullPath = `${folderPath}/${item.name}`;
      if (item.id) {
        files.push({ bucket, path: fullPath });
      } else {
        const subFiles = await listFolderRecursive(bucket, fullPath);
        files.push(...subFiles);
      }
    }
  } catch (err) {
    console.error(`Failed to list folder ${folderPath}:`, err);
  }

  return files;
}

/**
 * Download a file from storage with retry logic
 */
export async function downloadStorageFile(
  bucket: string,
  path: string,
  maxRetries: number = 2
): Promise<Blob | null> {
  if (!supabaseAdmin) return null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .download(path);

      if (error) {
        if (attempt === maxRetries) {
          console.error(`[Backup] Failed to download ${bucket}/${path} after ${maxRetries} attempts`);
        }
        continue;
      }

      return data;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`[Backup] Skipping ${bucket}/${path} (timeout/error)`);
      }
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return null;
}

/**
 * Create a backup ZIP file and upload to storage
 */
export async function createAndUploadBackup(
  options: BackupOptions = {}
): Promise<BackupResult> {
  const { includeStorage = true } = options;

  if (!supabaseAdmin) {
    return { success: false, error: "Supabase admin client not available" };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    // Export all tables
    console.log("[Backup] Exporting database tables...");
    const tableData = await exportAllTables();

    // Get total record count
    let totalRecords = 0;
    for (const table of Object.keys(tableData)) {
      console.log(`[Backup] - ${table}: ${tableData[table].length} records`);
      totalRecords += tableData[table].length;
    }
    console.log(`[Backup] Total records: ${totalRecords}`);

    // If not including storage, just upload JSON (much faster)
    if (!includeStorage) {
      console.log("[Backup] Creating JSON backup (no storage)...");
      const filename = `backup-${timestamp}.json`;
      
      const backupData = {
        timestamp: new Date().toISOString(),
        tables: tableData,
        meta: {
          totalRecords,
          tableCount: Object.keys(tableData).length,
        }
      };
      
      const jsonContent = JSON.stringify(backupData, null, 2);
      const buffer = Buffer.from(jsonContent, 'utf-8');

      console.log("[Backup] Uploading to storage...");
      const { error: uploadError } = await supabaseAdmin.storage
        .from("backups")
        .upload(filename, buffer, {
          contentType: "application/json",
          upsert: false,
        });

      if (uploadError) {
        console.error("[Backup] Upload error:", uploadError);
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      const { data: urlData } = await supabaseAdmin.storage
        .from("backups")
        .createSignedUrl(filename, 60 * 60 * 24 * 7);

      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`[Backup] ✅ Completed! Size: ${sizeMB} MB`);

      return {
        success: true,
        filename,
        url: urlData?.signedUrl,
        stats: {
          tables: Object.keys(tableData).length,
          totalRecords,
          files: 0,
          sizeBytes: buffer.length,
        },
      };
    }

    // Include storage - use ZIP
    console.log("[Backup] Listing storage files...");
    const storageFiles = await listStorageFiles();
    console.log(`[Backup] Found ${storageFiles.length} files in storage`);

    // Create ZIP archive
    console.log("[Backup] Creating ZIP archive...");
    const filename = `backup-${timestamp}.zip`;
    
    const archive = archiver("zip", {
      zlib: { level: 6 },
    });

    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.pipe(passthrough);

    // Add database export as JSON
    const dbJson = JSON.stringify(tableData, null, 2);
    archive.append(dbJson, { name: "database/all_tables.json" });

    // Add individual table exports
    for (const [table, data] of Object.entries(tableData)) {
      const tableJson = JSON.stringify(data, null, 2);
      archive.append(tableJson, { name: `database/${table}.json` });
    }

    // Add storage files
    let fileCount = 0;
    if (storageFiles.length > 0) {
      console.log(`[Backup] Downloading ${storageFiles.length} storage files...`);
      for (let i = 0; i < storageFiles.length; i++) {
        const file = storageFiles[i];
        if ((i + 1) % 10 === 0 || i === 0) {
          console.log(`[Backup] - Progress: ${i + 1}/${storageFiles.length}`);
        }
        const blob = await downloadStorageFile(file.bucket, file.path);
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          archive.append(buffer, { name: `storage/${file.bucket}/${file.path}` });
          fileCount++;
        }
      }
      console.log(`[Backup] Downloaded ${fileCount} files`);
    }

    // Finalize the archive
    console.log("[Backup] Finalizing ZIP...");
    await archive.finalize();

    // Wait for all data to be collected
    await new Promise<void>((resolve, reject) => {
      passthrough.on("end", resolve);
      passthrough.on("error", reject);
      archive.on("error", reject);
    });

    // Combine all chunks into a single buffer
    const zipBuffer = Buffer.concat(chunks);

    console.log("[Backup] Uploading backup to storage...");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("backups")
      .upload(filename, zipBuffer, {
        contentType: "application/zip",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Backup] Upload error:", uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from("backups")
      .createSignedUrl(filename, 60 * 60 * 24 * 7);

    const sizeMB = (zipBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`[Backup] ✅ Completed! Size: ${sizeMB} MB`);

    return {
      success: true,
      filename,
      url: urlData?.signedUrl,
      stats: {
        tables: Object.keys(tableData).length,
        totalRecords,
        files: fileCount,
        sizeBytes: zipBuffer.length,
      },
    };
  } catch (err) {
    console.error("[Backup] Failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get list of existing backups
 */
export async function listBackups(): Promise<
  { name: string; created_at: string; size: number }[]
> {
  if (!supabaseAdmin) return [];

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("backups")
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error || !data) return [];

    return data
      .filter((item) => item.name.endsWith(".zip"))
      .map((item) => ({
        name: item.name,
        created_at: item.created_at || "",
        size: item.metadata?.size || 0,
      }));
  } catch {
    return [];
  }
}

/**
 * Delete old backups (keep only the latest N)
 */
export async function cleanupOldBackups(keepCount: number = 7): Promise<number> {
  if (!supabaseAdmin) return 0;

  try {
    const backups = await listBackups();

    if (backups.length <= keepCount) return 0;

    const toDelete = backups.slice(keepCount);
    const filesToDelete = toDelete.map((b) => b.name);

    const { error } = await supabaseAdmin.storage
      .from("backups")
      .remove(filesToDelete);

    if (error) {
      console.error("Error deleting old backups:", error);
      return 0;
    }

    return filesToDelete.length;
  } catch {
    return 0;
  }
}
