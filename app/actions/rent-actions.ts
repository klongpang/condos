"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

export async function createPaymentAction(paymentData: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Creating payment:", paymentData);

    const { data, error } = await supabaseServer
      .from("rent_payments")
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error creating payment:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/rent");
    return { success: true, message: "สร้างรายการชำระเงินสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function updatePaymentAction(id: string, updates: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Updating payment:", id, updates);

    const { data, error } = await supabaseServer
      .from("rent_payments")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error updating payment:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/rent");
    return { success: true, message: "อัปเดตรายการชำระเงินสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  try {
    console.log("[Server Action] Deleting payment:", id);

    const { error } = await supabaseServer
      .from("rent_payments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Server Action] Error deleting payment:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/rent");
    return { success: true, message: "ลบรายการชำระเงินสำเร็จ" };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}
