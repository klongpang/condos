"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

export async function createTenantAction(tenantData: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Creating tenant:", tenantData);

    const { data, error } = await supabaseServer
      .from("tenants")
      .insert([tenantData])
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error creating tenant:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/tenants");
    return { success: true, message: "เพิ่มผู้เช่าสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function updateTenantAction(id: string, updates: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Updating tenant:", id, updates);

    const { data, error } = await supabaseServer
      .from("tenants")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error updating tenant:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/tenants");
    return { success: true, message: "อัปเดตข้อมูลผู้เช่าสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function endTenantContractAction(
  tenantId: string,
  tenantData: any, // Need tenant data to create history
  endData: {
    end_reason: string;
    actual_end_date: string;
    notes?: string;
  }
): Promise<ActionResult> {
  try {
    console.log("[Server Action] Ending contract for tenant:", tenantId, endData);

    // 1. Create History Record
    const { error: historyError } = await supabaseServer
      .from("tenant_history")
      .insert([
        {
          condo_id: tenantData.condo_id,
          full_name: tenantData.full_name,
          phone: tenantData.phone,
          line_id: tenantData.line_id,
          rental_start: tenantData.rental_start,
          rental_end: tenantData.rental_end,
          actual_end_date: endData.actual_end_date,
          deposit: tenantData.deposit,
          monthly_rent: tenantData.monthly_rent,
          end_reason: endData.end_reason,
          notes: endData.notes,
          moved_out_at: new Date().toISOString(),
        },
      ]);

    if (historyError) {
      console.error("[Server Action] Error creating tenant history:", historyError);
      return { success: false, message: "ไม่สามารถสร้างประวัติผู้เช่าได้: " + historyError.message };
    }

    // 2. Update Tenant Status to be Inactive
    const { error: updateError } = await supabaseServer
      .from("tenants")
      .update({
        is_active: false,
        status: "ended",
        end_reason: endData.end_reason,
        actual_end_date: endData.actual_end_date,
        notes: endData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateError) {
       console.error("[Server Action] Error updating tenant status:", updateError);
       // Note: History created but tenant not updated. Ideally should be transacton but Supabase client doesn't support easy transactions yet without RPC.
       // We accept this risk for now or could implement compensation logic.
       return { success: false, message: "ไม่สามารถอัปเดตสถานะผู้เช่าได้: " + updateError.message };
    }

    revalidatePath("/tenants");
    revalidatePath("/tenant-history"); // Revalidate history page as well
    return { success: true, message: "สิ้นสุดสัญญาและย้ายประวัติเรียบร้อยแล้ว" };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}
