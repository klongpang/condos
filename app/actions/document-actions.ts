"use server"

import { supabaseServer } from "@/lib/supabase-server"
import { v4 as uuidv4 } from "uuid"

interface UploadDocumentResult {
  success: boolean
  message: string
  documentId?: string
  fileUrl?: string
}

const isUuid = (v: string | null) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  const file = formData.get("file") as File | null

  const paymentId = (formData.get("paymentId") as string | null) || null
  let   incomeId  = (formData.get("incomeId")  as string | null) || null
  let   expenseId = (formData.get("expenseId") as string | null) || null

  const condoId   = (formData.get("condoId")   as string | null) || null
  const tenantId  = (formData.get("tenantId")  as string | null) || null
  const recordId  = (formData.get("recordId")  as string | null) || null
  const documentType = (formData.get("documentType") as string | null) || null

  if (!file) return { success: false, message: "ไม่พบไฟล์" }
  if (!paymentId && !incomeId && !expenseId && !condoId && !tenantId && !recordId) {
    return { success: false, message: "ต้องระบุ Income ID, Expense ID, Payment ID, Condo ID หรือ Tenant ID อย่างน้อย 1 อย่าง" }
  }
  if (!documentType) return { success: false, message: "ต้องระบุประเภทเอกสาร (documentType)" }

  // 1) ทำความสะอาดค่าให้เป็น null ถ้าไม่ใช่ UUID
  if (!isUuid(incomeId))  incomeId  = null
  if (!isUuid(expenseId)) expenseId = null

  // 2) ไม่ให้มีทั้ง incomeId และ expenseId พร้อมกัน (เลือกอันเดียว)
  if (incomeId && expenseId) {
    // ให้ income มาก่อน
    expenseId = null
  }

  // 3) Preflight ตรวจ FK: ถ้ามี incomeId/expenseId ให้เช็คว่ามีจริง
  if (incomeId) {
    const { data, error } = await supabaseServer
      .from("income_records")
      .select("id")
      .eq("id", incomeId)
      .single()
    if (error || !data) {
      return { success: false, message: "income_id ไม่ถูกต้องหรือไม่มีอยู่จริง" }
    }
  }
  if (expenseId) {
    const { data, error } = await supabaseServer
      .from("expense_records")
      .select("id")
      .eq("id", expenseId)
      .single()
    if (error || !data) {
      return { success: false, message: "expense_id ไม่ถูกต้องหรือไม่มีอยู่จริง" }
    }
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : ""
  const unique = ext ? `${uuidv4()}.${ext}` : uuidv4()

  const scopeFolder =
    incomeId  ? `incomes/${incomeId}` :
    expenseId ? `expenses/${expenseId}` :
    paymentId ? `payments/${paymentId}` :
    condoId   ? `condos/${condoId}` :
    tenantId  ? `tenants/${tenantId}` :
                `records/${recordId}`

  const objectPath = `${scopeFolder}/${documentType}/${unique}`

  try {
    // Upload to Storage
    const { data: up, error: upErr } = await supabaseServer.storage
      .from("documents")
      .upload(objectPath, file, { cacheControl: "3600", upsert: false })
    if (upErr) return { success: false, message: `อัปโหลดไฟล์ล้มเหลว: ${upErr.message}` }

    const { data: pub } = supabaseServer.storage.from("documents").getPublicUrl(up.path)
    const fileUrl = pub?.publicUrl
    if (!fileUrl) {
      await supabaseServer.storage.from("documents").remove([up.path])
      return { success: false, message: "ไม่สามารถรับ URL สาธารณะของไฟล์ได้" }
    }

    // Insert documents (ข้าม RLS ด้วย service role)
    const { data: inserted, error: insertErr } = await supabaseServer
      .from("documents")
      .insert([{
        name: file.name,
        file_url: fileUrl,
        file_type: file.type || "unknown",
        document_type: documentType,
        income_id:  incomeId  || null,
        expense_id: expenseId || null,
        payment_id: paymentId || null,
        condo_id:   condoId   || null,
        tenant_id:  tenantId  || null,
      }])
      .select("*")
      .single()

    if (insertErr || !inserted) {
      await supabaseServer.storage.from("documents").remove([up.path])
      return { success: false, message: insertErr?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลเอกสาร" }
    }

    return { success: true, message: "อัปโหลดสำเร็จ", documentId: inserted.id, fileUrl: inserted.file_url }
  } catch (e: any) {
    return { success: false, message: `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${e.message}` }
  }
}

export async function deleteDocumentAction(documentId: string, fileUrl: string): Promise<UploadDocumentResult> {
  try {
    const marker = "/public/documents/"
    const i = fileUrl.indexOf(marker)
    if (i < 0) return { success: false, message: "URL ไฟล์ไม่ถูกต้อง" }
    const storagePath = fileUrl.substring(i + marker.length)

    const { error: delErr } = await supabaseServer.storage.from("documents").remove([storagePath])
    if (delErr) return { success: false, message: `ลบไฟล์จาก Storage ล้มเหลว: ${delErr.message}` }

    const { error: dbErr } = await supabaseServer.from("documents").delete().eq("id", documentId)
    if (dbErr) return { success: false, message: `ลบข้อมูลเอกสารในฐานข้อมูลล้มเหลว: ${dbErr.message}` }

    return { success: true, message: "ลบเอกสารสำเร็จ" }
  } catch (e: any) {
    return { success: false, message: `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${e.message}` }
  }
}
