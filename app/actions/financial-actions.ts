"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

// --- Income Actions ---

export async function createIncomeAction(incomeData: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Creating income:", incomeData);

    const { data, error } = await supabaseServer
      .from("income_records")
      .insert([incomeData])
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error creating income:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/financials");
    revalidatePath("/reports"); // Reports depend on this data
    return { success: true, message: "บันทึกรายรับสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function updateIncomeAction(id: string, updates: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Updating income:", id, updates);

    const { data, error } = await supabaseServer
      .from("income_records")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error updating income:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/financials");
    revalidatePath("/reports");
    return { success: true, message: "อัปเดตข้อมูลรายรับสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  try {
    console.log("[Server Action] Deleting income:", id);

    const { error } = await supabaseServer
      .from("income_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Server Action] Error deleting income:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/financials");
    revalidatePath("/reports");
    return { success: true, message: "ลบรายการรายรับสำเร็จ" };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

// --- Expense Actions ---

export async function createExpenseAction(expenseData: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Creating expense:", expenseData);

    const { data, error } = await supabaseServer
      .from("expense_records")
      .insert([expenseData])
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error creating expense:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/financials");
    revalidatePath("/reports");
    return { success: true, message: "บันทึกรายจ่ายสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function updateExpenseAction(id: string, updates: any): Promise<ActionResult> {
  try {
    console.log("[Server Action] Updating expense:", id, updates);

    const { data, error } = await supabaseServer
      .from("expense_records")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error updating expense:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/financials");
    revalidatePath("/reports");
    return { success: true, message: "อัปเดตข้อมูลรายจ่ายสำเร็จ", data };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  try {
    console.log("[Server Action] Deleting expense:", id);

    const { error } = await supabaseServer
      .from("expense_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Server Action] Error deleting expense:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/financials");
    revalidatePath("/reports");
    return { success: true, message: "ลบรายการรายจ่ายสำเร็จ" };
  } catch (error: any) {
    console.error("[Server Action] Unexpected error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
  }
}
