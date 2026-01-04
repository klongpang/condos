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
 * ส่ง email แจ้งเตือนไปยังผู้รับที่ระบุ
 */
async function sendNotificationEmail(
  notifications: NotificationInput[],
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

  if (notifications.length === 0 || !recipientEmail) {
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
      to: recipientEmail,
      subject: `🔔 แจ้งเตือน: ${notifications.length} รายการ - ${now}`,
      html: htmlContent,
    });

    console.log(`[Notifications] ✅ Email sent to ${recipientEmail} with ${notifications.length} notifications`);
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
  notifications: NotificationInput[],
  client: any
): Promise<{ success: boolean; adminSent: boolean; usersSent: number; errors: string[] }> {
  const result = {
    success: true,
    adminSent: false,
    usersSent: 0,
    errors: [] as string[],
  };

  if (notifications.length === 0) {
    return result;
  }

  const adminEmail = NOTIFICATION_EMAIL_CONFIG.to;

  // 1. ส่ง email ให้ Admin (ได้รับทุก notification)
  if (adminEmail) {
    console.log(`[Notifications] Sending admin email to ${adminEmail}...`);
    const adminResult = await sendNotificationEmail(notifications, adminEmail, "Admin");
    if (adminResult.success) {
      result.adminSent = true;
    } else if (adminResult.error) {
      result.errors.push(`Admin email: ${adminResult.error}`);
    }
  }

  // 2. จัดกลุ่ม notifications ตาม user_id
  const notificationsByUser = new Map<string, NotificationInput[]>();
  for (const notification of notifications) {
    const userId = notification.user_id;
    if (!notificationsByUser.has(userId)) {
      notificationsByUser.set(userId, []);
    }
    notificationsByUser.get(userId)!.push(notification);
  }

  // 3. ดึง email ของแต่ละ user
  const userIds = Array.from(notificationsByUser.keys());
  const { data: users, error: usersError } = await client
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  if (usersError) {
    result.errors.push(`Failed to fetch users: ${usersError.message}`);
    result.success = false;
    return result;
  }

  // 4. ส่ง email ให้แต่ละ user ที่มี email
  for (const user of users || []) {
    if (!user.email) {
      console.log(`[Notifications] User ${user.id} has no email, skipping...`);
      continue;
    }

    // ข้าม admin email เพื่อไม่ให้ส่งซ้ำ (กรณี admin = user)
    if (user.email === adminEmail) {
      console.log(`[Notifications] User ${user.id} is admin, already sent, skipping...`);
      continue;
    }

    const userNotifications = notificationsByUser.get(user.id) || [];
    if (userNotifications.length === 0) continue;

    console.log(`[Notifications] Sending user email to ${user.email} (${userNotifications.length} notifications)...`);
    const userResult = await sendNotificationEmail(userNotifications, user.email, user.full_name);
    
    if (userResult.success) {
      result.usersSent++;
    } else if (userResult.error) {
      result.errors.push(`User ${user.email}: ${userResult.error}`);
    }
  }

  return result;
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

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateLocal(tomorrow);

  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = formatDateLocal(in30Days);

  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);
  const in60DaysStr = formatDateLocal(in60Days);

  console.log(`[Notifications] Date check: today=${todayStr}, tomorrow=${tomorrowStr}`);

  const allNotifications: NotificationInput[] = [];

  try {
    // ==================== 1. ค่าเช่าเกินกำหนด (rent_overdue) ====================
    // status = 'overdue' และ due_date < today - ส่งทุกครั้งที่รัน
    console.log("[Notifications] Checking overdue rent payments...");
    const runTimestamp = Date.now(); // ใช้ timestamp เพื่อให้ส่งได้ทุกครั้งที่รัน
    
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

        allNotifications.push({
          user_id: tenant.condo.user_id,
          type: "rent_overdue",
          title: `ค่าเช่าเกินกำหนด ${daysOverdue} วัน`,
          message: `ผู้เช่า: ${tenant.full_name} | ห้อง: ${tenant.condo.name} (${tenant.condo.room_number}) | ครบกำหนด: ${new Date(payment.due_date).toLocaleDateString("th-TH")}`,
          priority: "high",
          tenant_id: tenant.id,
          condo_id: tenant.condo.id,
          amount: payment.amount,
          reference_id: `rent_overdue_${payment.id}_${runTimestamp}`, // ใช้ timestamp เพื่อส่งทุกครั้ง
        });
      }
      console.log(`[Notifications] Found ${overduePayments.length} overdue payments`);
    }

    // ==================== 2. ค่าเช่าใกล้ครบกำหนด (rent_due) ====================
    // due_date = tomorrow และ status != 'paid'
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
    // แจ้งเตือนทุกวันสำหรับ tenant ที่ rental_end อยู่ภายใน 60 วัน
    console.log("[Notifications] Checking expiring contracts...");
    
    // Query: rental_end <= 60 days และ > today (ยังไม่หมดอายุ)
    const { data: expiringTenants, error: expiringError } = await client
      .from("tenants")
      .select(`
        *,
        condo:condo_id(id, name, room_number, user_id)
      `)
      .eq("is_active", true)
      .lte("rental_end", in60DaysStr)  // หมดภายใน 60 วัน
      .gt("rental_end", todayStr);      // ยังไม่หมดอายุ

    if (expiringError) {
      result.errors.push(`Contract expiring check failed: ${expiringError.message}`);
    } else if (expiringTenants) {
      for (const tenant of expiringTenants) {
        const condo = tenant.condo as Condo;
        if (!condo?.user_id) continue;

        const daysUntilExpiry = Math.ceil(
          (new Date(tenant.rental_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // ใช้ reference_id ตามวันที่ เพื่อให้ส่งได้ทุกวัน แต่ไม่ซ้ำในวันเดียวกัน
        const referenceId = `contract_expiring_${tenant.id}_${todayStr}`;

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
      console.log(`[Notifications] Found ${expiringTenants.length} expiring contracts (within 60 days)`);
    }

    // ==================== 4. ถึงกำหนดชำระค่าคอนโด (condo_payment_due) ====================
    // payment_due_date ตรงกับวันนี้ (เก็บเป็น text ของวันที่ เช่น "4", "15")
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
        // payment_due_date เก็บเป็น text ของวันที่ เช่น "4", "15", "28"
        // ตรวจสอบโดยเปรียบเทียบโดยตรง
        const dueDay = String(condo.payment_due_date).trim();
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
        condoPaymentCount++;
      }
      console.log(`[Notifications] Found ${condoPaymentCount} condo payments due (today is day ${todayDay})`);
    }

    // ==================== Insert notifications ====================
    if (allNotifications.length > 0) {
      console.log(`[Notifications] Inserting ${allNotifications.length} notifications...`);
      
      // Get existing reference_ids to avoid duplicates
      const referenceIds = allNotifications.map((n) => n.reference_id);
      const { data: existing } = await client
        .from("notifications")
        .select("reference_id")
        .in("reference_id", referenceIds);
      
      const existingRefs = new Set(existing?.map((e) => e.reference_id) || []);
      
      // Filter out notifications that already exist
      const newNotifications = allNotifications.filter(
        (n) => !existingRefs.has(n.reference_id)
      );
      
      if (newNotifications.length > 0) {
        const { data: inserted, error: insertError } = await client
          .from("notifications")
          .insert(
            newNotifications.map((n) => ({
              ...n,
              date: new Date().toISOString(),
              is_read: false,
              email_sent: false,
            }))
          )
          .select();

        if (insertError) {
          result.errors.push(`Insert failed: ${insertError.message}`);
          result.success = false;
        } else {
          result.created = inserted?.length || 0;
          console.log(`[Notifications] ✅ Created ${result.created} new notifications`);
        }
      } else {
        console.log(`[Notifications] All ${allNotifications.length} notifications already exist, skipping insert`);
      }
    }

    // ==================== Send emails (Admin + Users) ====================
    if (allNotifications.length > 0) {
      const emailResult = await sendUserSpecificEmails(allNotifications, client);
      
      if (emailResult.adminSent || emailResult.usersSent > 0) {
        result.emailsSent = (emailResult.adminSent ? 1 : 0) + emailResult.usersSent;
        
        // Mark notifications as email_sent
        const referenceIds = allNotifications.map((n) => n.reference_id);
        await client
          .from("notifications")
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .in("reference_id", referenceIds);
          
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

  return result;
}
