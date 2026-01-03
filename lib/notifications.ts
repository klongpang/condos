import { supabaseAdmin, supabase } from "./supabase";
import type { Notification, RentPayment, Tenant, Condo } from "./supabase";
import nodemailer from "nodemailer";

// Email configuration for notifications
const NOTIFICATION_EMAIL_CONFIG = {
  user: process.env.NOTIFICATION_EMAIL_USER || process.env.BACKUP_EMAIL_USER,
  pass: process.env.NOTIFICATION_EMAIL_PASS || process.env.BACKUP_EMAIL_PASS,
  to: process.env.NOTIFICATION_EMAIL_TO || process.env.BACKUP_EMAIL_TO,
};

interface NotificationResult {
  success: boolean;
  created: number;
  emailsSent: number;
  errors: string[];
}

interface NotificationInput {
  user_id: string;
  type: Notification["type"];
  title: string;
  message: string;
  priority: Notification["priority"];
  tenant_id?: string;
  condo_id?: string;
  amount?: number;
  reference_id: string;
}

/**
 * ส่ง email แจ้งเตือน
 */
async function sendNotificationEmail(
  notifications: NotificationInput[]
): Promise<{ success: boolean; error?: string }> {
  const { user, pass, to } = NOTIFICATION_EMAIL_CONFIG;

  if (!user || !pass || !to) {
    return {
      success: false,
      error: "Email not configured. Set NOTIFICATION_EMAIL_USER, NOTIFICATION_EMAIL_PASS, NOTIFICATION_EMAIL_TO",
    };
  }

  if (notifications.length === 0) {
    return { success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    // Group notifications by priority
    const highPriority = notifications.filter((n) => n.priority === "high");
    const mediumPriority = notifications.filter((n) => n.priority === "medium");
    const lowPriority = notifications.filter((n) => n.priority === "low");

    const renderNotifications = (items: NotificationInput[], color: string) =>
      items
        .map(
          (n) => `
        <div style="border-left: 4px solid ${color}; padding: 10px; margin: 10px 0; background: #f9f9f9;">
          <strong>${n.title}</strong>
          <p style="margin: 5px 0; color: #666;">${n.message}</p>
          ${n.amount ? `<p style="margin: 5px 0; font-weight: bold;">จำนวนเงิน: ฿${n.amount.toLocaleString()}</p>` : ""}
        </div>
      `
        )
        .join("");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">🔔 สรุปการแจ้งเตือนประจำวัน</h2>
        <p style="color: #666;">วันที่: ${now}</p>
        
        ${
          highPriority.length > 0
            ? `
          <h3 style="color: #dc2626;">⚠️ สำคัญสูง (${highPriority.length} รายการ)</h3>
          ${renderNotifications(highPriority, "#dc2626")}
        `
            : ""
        }
        
        ${
          mediumPriority.length > 0
            ? `
          <h3 style="color: #f59e0b;">📋 สำคัญปานกลาง (${mediumPriority.length} รายการ)</h3>
          ${renderNotifications(mediumPriority, "#f59e0b")}
        `
            : ""
        }
        
        ${
          lowPriority.length > 0
            ? `
          <h3 style="color: #10b981;">ℹ️ ทั่วไป (${lowPriority.length} รายการ)</h3>
          ${renderNotifications(lowPriority, "#10b981")}
        `
            : ""
        }
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">
          ข้อความนี้ส่งโดยอัตโนมัติจากระบบจัดการคอนโด
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: user,
      to,
      subject: `🔔 แจ้งเตือน: ${notifications.length} รายการ - ${now}`,
      html: htmlContent,
    });

    console.log(`[Notifications] ✅ Email sent to ${to} with ${notifications.length} notifications`);
    return { success: true };
  } catch (err) {
    console.error("[Notifications] Email failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

/**
 * ตรวจสอบและสร้าง notifications ทั้งหมด
 */
export async function checkAndGenerateNotifications(): Promise<NotificationResult> {
  const client = supabaseAdmin || supabase;
  const result: NotificationResult = {
    success: true,
    created: 0,
    emailsSent: 0,
    errors: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().split("T")[0];

  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);
  const in60DaysStr = in60Days.toISOString().split("T")[0];

  const allNotifications: NotificationInput[] = [];

  try {
    // ==================== 1. ค่าเช่าเกินกำหนด (rent_overdue) ====================
    // status = 'unpaid' และ due_date < today
    console.log("[Notifications] Checking overdue rent payments...");
    const { data: overduePayments, error: overdueError } = await client
      .from("rent_payments")
      .select(`
        *,
        tenant:tenant_id(
          id,
          full_name,
          condo:condo_id(id, name, room_number, user_id)
        )
      `)
      .eq("status", "unpaid")
      .lt("due_date", todayStr);

    if (overdueError) {
      result.errors.push(`Overdue check failed: ${overdueError.message}`);
    } else if (overduePayments) {
      for (const payment of overduePayments) {
        const tenant = payment.tenant as Tenant & { condo: Condo };
        if (!tenant?.condo?.user_id) continue;

        const daysOverdue = Math.floor(
          (today.getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        allNotifications.push({
          user_id: tenant.condo.user_id,
          type: "rent_overdue",
          title: `ค่าเช่าเกินกำหนด ${daysOverdue} วัน`,
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${tenant.condo.name} (${tenant.condo.room_number}) | ครบกำหนด: ${new Date(payment.due_date).toLocaleDateString("th-TH")}`,
          priority: "high",
          tenant_id: tenant.id,
          condo_id: tenant.condo.id,
          amount: payment.amount,
          reference_id: `rent_overdue_${payment.id}_${todayStr}`,
        });
      }
      console.log(`[Notifications] Found ${overduePayments.length} overdue payments`);
    }

    // ==================== 2. ค่าเช่าใกล้ครบกำหนด (rent_due) ====================
    // due_date = tomorrow และ status != 'paid'
    console.log("[Notifications] Checking rent due tomorrow...");
    const { data: dueSoonPayments, error: dueSoonError } = await client
      .from("rent_payments")
      .select(`
        *,
        tenant:tenant_id(
          id,
          full_name,
          condo:condo_id(id, name, room_number, user_id)
        )
      `)
      .eq("due_date", tomorrowStr)
      .neq("status", "paid");

    if (dueSoonError) {
      result.errors.push(`Due soon check failed: ${dueSoonError.message}`);
    } else if (dueSoonPayments) {
      for (const payment of dueSoonPayments) {
        const tenant = payment.tenant as Tenant & { condo: Condo };
        if (!tenant?.condo?.user_id) continue;

        allNotifications.push({
          user_id: tenant.condo.user_id,
          type: "rent_due",
          title: "ค่าเช่าครบกำหนดพรุ่งนี้",
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${tenant.condo.name} (${tenant.condo.room_number}) | ครบกำหนด: ${new Date(payment.due_date).toLocaleDateString("th-TH")}`,
          priority: "medium",
          tenant_id: tenant.id,
          condo_id: tenant.condo.id,
          amount: payment.amount,
          reference_id: `rent_due_${payment.id}_${todayStr}`,
        });
      }
      console.log(`[Notifications] Found ${dueSoonPayments.length} payments due tomorrow`);
    }

    // ==================== 3. สัญญาใกล้หมดอายุ (contract_expiring) ====================
    // - ส่งครั้งเดียวตอน 60 วันก่อนหมด
    // - ส่งทุกวันเมื่อเหลือ 30 วันหรือน้อยกว่า
    console.log("[Notifications] Checking expiring contracts...");
    
    // Query: rental_end = exactly 60 days OR rental_end <= 30 days
    const { data: expiringTenants, error: expiringError } = await client
      .from("tenants")
      .select(`
        *,
        condo:condo_id(id, name, room_number, user_id)
      `)
      .eq("is_active", true)
      .or(`rental_end.eq.${in60DaysStr},rental_end.lte.${in30DaysStr}`)
      .gt("rental_end", todayStr); // ยังไม่หมดอายุ

    if (expiringError) {
      result.errors.push(`Contract expiring check failed: ${expiringError.message}`);
    } else if (expiringTenants) {
      for (const tenant of expiringTenants) {
        const condo = tenant.condo as Condo;
        if (!condo?.user_id) continue;

        const daysUntilExpiry = Math.ceil(
          (new Date(tenant.rental_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // สร้าง reference_id ตามเงื่อนไข:
        // - 60 วัน: ส่งครั้งเดียว (reference ตาม tenant + "60days")
        // - <= 30 วัน: ส่งทุกวัน (reference ตาม tenant + วันที่)
        const referenceId = daysUntilExpiry > 30
          ? `contract_expiring_${tenant.id}_60days`  // ส่งครั้งเดียว
          : `contract_expiring_${tenant.id}_${todayStr}`;  // ส่งทุกวัน

        allNotifications.push({
          user_id: condo.user_id,
          type: "contract_expiring",
          title: `สัญญาหมดอายุใน ${daysUntilExpiry} วัน`,
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${condo.name} (${condo.room_number}) | สิ้นสุด: ${new Date(tenant.rental_end).toLocaleDateString("th-TH")}`,
          priority: daysUntilExpiry <= 30 ? "high" : "medium",
          tenant_id: tenant.id,
          condo_id: condo.id,
          amount: tenant.monthly_rent,
          reference_id: referenceId,
        });
      }
      console.log(`[Notifications] Found ${expiringTenants.length} expiring contracts`);
    }

    // ==================== 4. ถึงกำหนดชำระค่าคอนโด (condo_payment_due) ====================
    // payment_due_date ตรงกับวันนี้
    console.log("[Notifications] Checking condo payment due dates...");
    const todayDay = today.getDate().toString();
    
    const { data: condosDue, error: condosDueError } = await client
      .from("condos")
      .select("*")
      .eq("is_active", true)
      .not("payment_due_date", "is", null);

    if (condosDueError) {
      result.errors.push(`Condo payment check failed: ${condosDueError.message}`);
    } else if (condosDue) {
      for (const condo of condosDue) {
        // Check if payment_due_date matches today's day
        const dueDay = new Date(condo.payment_due_date).getDate().toString();
        if (dueDay !== todayDay) continue;
        if (!condo.user_id) continue;

        allNotifications.push({
          user_id: condo.user_id,
          type: "condo_payment_due",
          title: "ถึงกำหนดชำระค่าคอนโด",
          message: `คอนโด: ${condo.name} (${condo.room_number}) | วันครบกำหนด: วันที่ ${dueDay} ของเดือน`,
          priority: "high",
          condo_id: condo.id,
          amount: condo.installment_amount,
          reference_id: `condo_payment_${condo.id}_${todayStr}`,
        });
      }
      console.log(`[Notifications] Found ${condosDue.filter(c => new Date(c.payment_due_date).getDate().toString() === todayDay).length} condo payments due`);
    }

    // ==================== Insert notifications ====================
    if (allNotifications.length > 0) {
      console.log(`[Notifications] Inserting ${allNotifications.length} notifications...`);
      
      // Use upsert with reference_id to avoid duplicates
      const { data: inserted, error: insertError } = await client
        .from("notifications")
        .upsert(
          allNotifications.map((n) => ({
            ...n,
            date: new Date().toISOString(),
            is_read: false,
            email_sent: false,
          })),
          {
            onConflict: "user_id,reference_id",
            ignoreDuplicates: true,
          }
        )
        .select();

      if (insertError) {
        result.errors.push(`Insert failed: ${insertError.message}`);
        result.success = false;
      } else {
        result.created = inserted?.length || 0;
        console.log(`[Notifications] ✅ Created ${result.created} new notifications`);
      }
    }

    // ==================== Send email ====================
    if (allNotifications.length > 0) {
      const emailResult = await sendNotificationEmail(allNotifications);
      if (emailResult.success) {
        result.emailsSent = allNotifications.length;
        
        // Mark notifications as email_sent
        const referenceIds = allNotifications.map((n) => n.reference_id);
        await client
          .from("notifications")
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .in("reference_id", referenceIds);
      } else if (emailResult.error) {
        result.errors.push(`Email: ${emailResult.error}`);
      }
    }
  } catch (err) {
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : "Unknown error");
  }

  return result;
}
