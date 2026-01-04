import { supabaseAdmin, supabase } from "./supabase";
import type { NotificationItem, NotificationPriority, NotificationType, Tenant, Condo } from "./supabase";
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
  updated: number;
  emailsSent: number;
  errors: string[];
}

interface UserNotificationData {
  user_id: string;
  items: NotificationItem[];
  high_count: number;
  medium_count: number;
}

/**
 * ส่ง email แจ้งเตือนไปยังผู้รับที่ระบุ
 */
async function sendNotificationEmail(
  items: NotificationItem[],
  recipientEmail: string,
  recipientName?: string
): Promise<{ success: boolean; error?: string }> {
  const { user, pass } = NOTIFICATION_EMAIL_CONFIG;

  if (!user || !pass) {
    return {
      success: false,
      error: "Email not configured. Set NOTIFICATION_EMAIL_USER, NOTIFICATION_EMAIL_PASS",
    };
  }

  if (items.length === 0 || !recipientEmail) {
    return { success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    // Group items by priority
    const highPriority = items.filter((n) => n.priority === "high");
    const mediumPriority = items.filter((n) => n.priority === "medium");
    const lowPriority = items.filter((n) => n.priority === "low");

    const renderItems = (notificationItems: NotificationItem[], color: string) =>
      notificationItems
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

    const greeting = recipientName ? `สวัสดี ${recipientName},` : "สวัสดี,";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="color: #333;">${greeting}</p>
        <h2 style="color: #1a1a1a;">🔔 สรุปการแจ้งเตือนประจำวัน</h2>
        <p style="color: #666;">วันที่: ${now}</p>
        
        ${
          highPriority.length > 0
            ? `
          <h3 style="color: #dc2626;">⚠️ สำคัญสูง (${highPriority.length} รายการ)</h3>
          ${renderItems(highPriority, "#dc2626")}
        `
            : ""
        }
        
        ${
          mediumPriority.length > 0
            ? `
          <h3 style="color: #f59e0b;">📋 สำคัญปานกลาง (${mediumPriority.length} รายการ)</h3>
          ${renderItems(mediumPriority, "#f59e0b")}
        `
            : ""
        }
        
        ${
          lowPriority.length > 0
            ? `
          <h3 style="color: #10b981;">ℹ️ ทั่วไป (${lowPriority.length} รายการ)</h3>
          ${renderItems(lowPriority, "#10b981")}
        `
            : ""
        }
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <div style="text-align: center; padding: 20px 0;">
          <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
            เข้าสู่ระบบเพื่อดูรายละเอียดเพิ่มเติม
          </p>
          <a href="https://condos-kub.vercel.app/" 
             style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            ใช้งานระบบจัดการคอนโด
          </a>
          <p style="color: #999; font-size: 11px; margin: 15px 0 0 0;">
            ระบบจัดการคอนโด | condos-kub.vercel.app
          </p>
          <p style="color: #bbb; font-size: 10px; margin: 5px 0 0 0;">
            ข้อความนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: user,
      to: recipientEmail,
      subject: `[Condos] 🔔 แจ้งเตือน ${items.length} รายการ - ${now}`,
      html: htmlContent,
    });

    console.log(`[Notifications] ✅ Email sent to ${recipientEmail} with ${items.length} items`);
    return { success: true };
  } catch (err) {
    console.error(`[Notifications] Email failed for ${recipientEmail}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

/**
 * ส่ง email แยกตาม user - Admin ได้รับทั้งหมด, User ได้รับเฉพาะของตัวเอง
 */
async function sendUserSpecificEmails(
  userDataMap: Map<string, UserNotificationData>,
  allItems: NotificationItem[],
  client: any
): Promise<{ success: boolean; adminSent: boolean; usersSent: number; errors: string[] }> {
  const result = {
    success: true,
    adminSent: false,
    usersSent: 0,
    errors: [] as string[],
  };

  if (allItems.length === 0) {
    return result;
  }

  const adminEmail = NOTIFICATION_EMAIL_CONFIG.to;

  // 1. ส่ง email ให้ Admin (ได้รับทุก notification)
  if (adminEmail) {
    console.log(`[Notifications] Sending admin email to ${adminEmail}...`);
    const adminResult = await sendNotificationEmail(allItems, adminEmail, "Admin");
    if (adminResult.success) {
      result.adminSent = true;
    } else if (adminResult.error) {
      result.errors.push(`Admin email: ${adminResult.error}`);
    }
  }

  // 2. ดึง email ของแต่ละ user
  const userIds = Array.from(userDataMap.keys());
  const { data: users, error: usersError } = await client
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  if (usersError) {
    result.errors.push(`Failed to fetch users: ${usersError.message}`);
    result.success = false;
    return result;
  }

  // 3. ส่ง email ให้แต่ละ user ที่มี email
  for (const user of users || []) {
    if (!user.email) {
      console.log(`[Notifications] User ${user.id} has no email, skipping...`);
      continue;
    }

    // ข้าม admin email เพื่อไม่ให้ส่งซ้ำ
    if (user.email === adminEmail) {
      console.log(`[Notifications] User ${user.id} is admin, already sent, skipping...`);
      continue;
    }

    const userData = userDataMap.get(user.id);
    if (!userData || userData.items.length === 0) continue;

    console.log(`[Notifications] Sending user email to ${user.email} (${userData.items.length} items)...`);
    const userResult = await sendNotificationEmail(userData.items, user.email, user.full_name);
    
    if (userResult.success) {
      result.usersSent++;
    } else if (userResult.error) {
      result.errors.push(`User ${user.email}: ${userResult.error}`);
    }
  }

  return result;
}

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * ตรวจสอบและสร้าง notification summaries
 */
export async function checkAndGenerateNotifications(): Promise<NotificationResult> {
  const client = supabaseAdmin || supabase;
  const result: NotificationResult = {
    success: true,
    created: 0,
    updated: 0,
    emailsSent: 0,
    errors: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateLocal(tomorrow);

  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);
  const in60DaysStr = formatDateLocal(in60Days);

  console.log(`[Notifications] Date check: today=${todayStr}, tomorrow=${tomorrowStr}`);

  // Map to collect items per user
  const userDataMap = new Map<string, UserNotificationData>();
  const allItems: NotificationItem[] = [];

  const addItem = (userId: string, item: NotificationItem) => {
    if (!userDataMap.has(userId)) {
      userDataMap.set(userId, {
        user_id: userId,
        items: [],
        high_count: 0,
        medium_count: 0,
      });
    }
    const userData = userDataMap.get(userId)!;
    userData.items.push(item);
    if (item.priority === "high") userData.high_count++;
    if (item.priority === "medium") userData.medium_count++;
    allItems.push(item);
  };

  try {
    // ==================== 1. ค่าเช่าเกินกำหนด (rent_overdue) ====================
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
      .eq("status", "overdue")
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

        addItem(tenant.condo.user_id, {
          type: "rent_overdue",
          title: `ค่าเช่าเกินกำหนด ${daysOverdue} วัน`,
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${tenant.condo.name} (${tenant.condo.room_number}) | ครบกำหนด: ${new Date(payment.due_date).toLocaleDateString("th-TH")}`,
          priority: "high",
          amount: payment.amount,
          tenant_id: tenant.id,
          condo_id: tenant.condo.id,
        });
      }
      console.log(`[Notifications] Found ${overduePayments.length} overdue payments`);
    }

    // ==================== 2. ค่าเช่าใกล้ครบกำหนด (rent_due) ====================
    console.log(`[Notifications] Checking rent due tomorrow (${tomorrowStr})...`);
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

        addItem(tenant.condo.user_id, {
          type: "rent_due",
          title: "ค่าเช่าครบกำหนดพรุ่งนี้",
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${tenant.condo.name} (${tenant.condo.room_number}) | ครบกำหนด: ${new Date(payment.due_date).toLocaleDateString("th-TH")}`,
          priority: "medium",
          amount: payment.amount,
          tenant_id: tenant.id,
          condo_id: tenant.condo.id,
        });
      }
      console.log(`[Notifications] Found ${dueSoonPayments.length} payments due tomorrow`);
    }

    // ==================== 3. สัญญาใกล้หมดอายุ (contract_expiring) ====================
    console.log("[Notifications] Checking expiring contracts...");
    const { data: expiringTenants, error: expiringError } = await client
      .from("tenants")
      .select(`
        *,
        condo:condo_id(id, name, room_number, user_id)
      `)
      .eq("is_active", true)
      .lte("rental_end", in60DaysStr)
      .gt("rental_end", todayStr);

    if (expiringError) {
      result.errors.push(`Contract expiring check failed: ${expiringError.message}`);
    } else if (expiringTenants) {
      for (const tenant of expiringTenants) {
        const condo = tenant.condo as Condo;
        if (!condo?.user_id) continue;

        const daysUntilExpiry = Math.ceil(
          (new Date(tenant.rental_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        addItem(condo.user_id, {
          type: "contract_expiring",
          title: `สัญญาหมดอายุใน ${daysUntilExpiry} วัน`,
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${condo.name} (${condo.room_number}) | สิ้นสุด: ${new Date(tenant.rental_end).toLocaleDateString("th-TH")}`,
          priority: daysUntilExpiry <= 30 ? "high" : "medium",
          amount: tenant.monthly_rent,
          tenant_id: tenant.id,
          condo_id: condo.id,
        });
      }
      console.log(`[Notifications] Found ${expiringTenants.length} expiring contracts`);
    }

    // ==================== 4. ถึงกำหนดชำระค่าคอนโด (condo_payment_due) ====================
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
      let condoPaymentCount = 0;
      for (const condo of condosDue) {
        const dueDay = String(condo.payment_due_date).trim();
        if (dueDay !== todayDay) continue;
        if (!condo.user_id) continue;

        addItem(condo.user_id, {
          type: "condo_payment_due",
          title: "ถึงกำหนดชำระค่าคอนโด",
          message: `คอนโด: ${condo.name} (${condo.room_number}) | วันครบกำหนด: วันที่ ${dueDay} ของเดือน`,
          priority: "high",
          amount: condo.installment_amount,
          condo_id: condo.id,
        });
        condoPaymentCount++;
      }
      console.log(`[Notifications] Found ${condoPaymentCount} condo payments due (today is day ${todayDay})`);
    }

    // ==================== Upsert notification summaries ====================
    if (userDataMap.size > 0) {
      console.log(`[Notifications] Upserting ${userDataMap.size} notification summaries...`);
      
      for (const [userId, userData] of userDataMap) {
        const { data: existing, error: selectError } = await client
          .from("notification_summaries")
          .select("id, items")
          .eq("user_id", userId)
          .eq("date", todayStr)
          .single();

        if (selectError && selectError.code !== "PGRST116") {
          result.errors.push(`Select failed for user ${userId}: ${selectError.message}`);
          continue;
        }

        if (existing) {
          // Update existing record - merge items
          const existingItems = existing.items || [];
          const mergedItems = [...existingItems, ...userData.items];
          const highCount = mergedItems.filter(i => i.priority === "high").length;
          const mediumCount = mergedItems.filter(i => i.priority === "medium").length;

          const { error: updateError } = await client
            .from("notification_summaries")
            .update({
              items: mergedItems,
              total_count: mergedItems.length,
              high_count: highCount,
              medium_count: mediumCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            result.errors.push(`Update failed for user ${userId}: ${updateError.message}`);
          } else {
            result.updated++;
          }
        } else {
          // Insert new record
          const { error: insertError } = await client
            .from("notification_summaries")
            .insert({
              user_id: userId,
              date: todayStr,
              items: userData.items,
              total_count: userData.items.length,
              high_count: userData.high_count,
              medium_count: userData.medium_count,
              is_read: false,
              email_sent: false,
            });

          if (insertError) {
            result.errors.push(`Insert failed for user ${userId}: ${insertError.message}`);
          } else {
            result.created++;
          }
        }
      }
      console.log(`[Notifications] ✅ Created ${result.created}, Updated ${result.updated} summaries`);
    }

    // ==================== Send emails ====================
    if (allItems.length > 0) {
      const emailResult = await sendUserSpecificEmails(userDataMap, allItems, client);
      
      if (emailResult.adminSent || emailResult.usersSent > 0) {
        result.emailsSent = (emailResult.adminSent ? 1 : 0) + emailResult.usersSent;
        
        // Mark summaries as email_sent
        for (const userId of userDataMap.keys()) {
          await client
            .from("notification_summaries")
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("date", todayStr);
        }
        
        console.log(`[Notifications] ✅ Emails sent: Admin=${emailResult.adminSent}, Users=${emailResult.usersSent}`);
      }
      
      if (emailResult.errors.length > 0) {
        result.errors.push(...emailResult.errors);
      }
    }
  } catch (err) {
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : "Unknown error");
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}
