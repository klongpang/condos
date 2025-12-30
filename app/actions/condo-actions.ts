"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

export async function createCondoAction(condoData: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Creating condo:", condoData);

    const { data, error } = await supabaseServer
      .from("condos")
      .insert([condoData])
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error creating condo:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/condos");
    return { success: true, message: "สร้างคอนโดสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function updateCondoAction(id: string, updates: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Updating condo:", id, updates);

    const { data, error } = await supabaseServer
      .from("condos")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error updating condo:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/condos");
    return { success: true, message: "อัปเดตข้อมูลคอนโดสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function deleteCondoAction(id: string): Promise<ActionResult> {
  try {
    console.log("[Server Action] Deleting (soft) condo:", id);

    // Soft delete: set is_active to false
    const { error } = await supabaseServer
      .from("condos")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[Server Action] Error deleting condo:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/condos");
    return { success: true, message: "ปิดใช้งานคอนโดสำเร็จ" };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}
