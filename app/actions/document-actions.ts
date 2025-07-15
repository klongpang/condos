"use server"

import { supabaseServer } from "@/lib/supabase-server"
import { documentService } from "@/lib/database"
import { v4 as uuidv4 } from "uuid"

interface UploadDocumentResult {
  success: boolean
  message: string
  documentId?: string
  fileUrl?: string
}

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  const file = formData.get("file") as File | null
  const condoId = formData.get("condoId") as string | null
  const tenantId = formData.get("tenantId") as string | null // Optional for tenant documents
  const documentType = formData.get("documentType") as string | null
  const recordId = formData.get("recordId") as string | null // Optional for financial records

  if (!file) {
    return { success: false, message: "ไม่พบไฟล์" }
  }
  if (!condoId && !tenantId && !recordId) {
    return { success: false, message: "ต้องระบุ Condo ID, Tenant ID หรือ Record ID" }
  }
  if (!documentType) {
    return { success: false, message: "ต้องระบุประเภทเอกสาร" }
  }

  const fileExtension = file.name.split(".").pop()
  const uniqueFileName = `${uuidv4()}.${fileExtension}` // Generate unique file name
  const folderPath = condoId || tenantId || recordId // Use the relevant ID for folder structure

  try {
    // Upload file to Supabase Storage
    const { data, error: uploadError } = await supabaseServer.storage
      .from("documents")
      .upload(`${folderPath}/${uniqueFileName}`, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError)
      return { success: false, message: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${uploadError.message}` }
    }

    // Get public URL
    const { data: publicUrlData } = supabaseServer.storage.from("documents").getPublicUrl(data.path)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return { success: false, message: "ไม่สามารถรับ URL สาธารณะของไฟล์ได้" }
    }

    const fileUrl = publicUrlData.publicUrl

    // Save document metadata to database
    const newDocument = await documentService.create({
      condo_id: condoId || undefined,
      tenant_id: tenantId || undefined,
      // For financial records, you would need to add income_record_id or expense_record_id to the documents table schema
      // For now, we link to condo_id if available, or leave null if only recordId is present and no condoId.
      name: file.name, // Original file name
      file_url: fileUrl,
      file_type: file.type || "unknown",
      document_type: documentType,
    })

    if (!newDocument) {
      // If database save fails, consider deleting the uploaded file from storage
      await supabaseServer.storage.from("documents").remove([data.path])
      return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลเอกสาร" }
    }

    return {
      success: true,
      message: "อัปโหลดไฟล์และบันทึกข้อมูลสำเร็จ",
      documentId: newDocument.id,
      fileUrl: newDocument.file_url,
    }
  } catch (error: any) {
    console.error("Server Action Error:", error)
    return { success: false, message: `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}` }
  }
}

export async function deleteDocumentAction(documentId: string, fileUrl: string): Promise<UploadDocumentResult> {
  try {
    // Extract file path from URL for Supabase Storage deletion
    // Assuming the URL format is like: https://[project_id].supabase.co/storage/v1/object/public/documents/[folder]/[filename]
    const urlParts = fileUrl.split("/public/documents/")
    if (urlParts.length < 2) {
      return { success: false, message: "URL ไฟล์ไม่ถูกต้อง ไม่สามารถระบุตำแหน่งใน Storage ได้" }
    }
    const filePathInStorage = urlParts[1]

    // Delete from Supabase Storage
    const { error: storageError } = await supabaseServer.storage.from("documents").remove([filePathInStorage])

    if (storageError) {
      console.error("Supabase Storage Delete Error:", storageError)
      return { success: false, message: `เกิดข้อผิดพลาดในการลบไฟล์จาก Storage: ${storageError.message}` }
    }

    // Delete from database
    const success = await documentService.delete(documentId)

    if (!success) {
      return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูลเอกสารจากฐานข้อมูล" }
    }

    return { success: true, message: "ลบเอกสารสำเร็จ" }
  } catch (error: any) {
    console.error("Server Action Error (deleteDocumentAction):", error)
    return { success: false, message: `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}` }
  }
}
