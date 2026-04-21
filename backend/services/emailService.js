"use strict";

const nodemailer = require("nodemailer");

// ─────────────────────────────────────────────────────────────────────────────
// Build transporter from .env (supports Gmail, SMTP, etc.)
// ─────────────────────────────────────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",  // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Send access-granted email to the user
// ─────────────────────────────────────────────────────────────────────────────
async function sendAccessGrantedEmail({ userEmail, adminEmail, catalog, schema, table, privileges }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("⚠️  Email not configured (SMTP_USER / SMTP_PASS missing). Skipping email.");
        return { skipped: true };
    }

    const transporter = createTransporter();

    const privList = String(privileges).split(",").map(p => p.trim()).join(", ");
    const fullTable = `${catalog}.${schema}.${table}`;
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const mailOptions = {
        from: `"Databricks Governance Portal" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `✅ Databricks Access Granted: ${schema}.${table}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">⚡ Databricks Access Granted</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 14px;">Your access has been granted by the admin</p>
        </div>

        <div style="background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; font-weight: 600; color: #6b7280; width: 130px;">👤 User</td>
              <td style="padding: 10px 0;">${userEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">🛡️ Granted By</td>
              <td style="padding: 10px 0;">${adminEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">🗄️ Table</td>
              <td style="padding: 10px 0;"><code style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">${fullTable}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">🔑 Privileges</td>
              <td style="padding: 10px 0;">
                ${String(privileges).split(",").map(p => `<span style="display:inline-block; background:#ede9fe; color:#5b21b6; padding:2px 8px; border-radius:20px; font-size:12px; font-weight:600; margin:2px;">${p.trim()}</span>`).join("")}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: 600; color: #6b7280;">🕐 Granted At</td>
              <td style="padding: 10px 0; font-size: 13px; color: #9ca3af;">${now} IST</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #166534;">
          ✅ You can now access <strong>${fullTable}</strong> with <strong>${privList}</strong> privileges in Databricks.
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
          This is an automated message from the Databricks Governance Portal. Do not reply.
        </p>
      </div>
    `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Access-granted email sent to ${userEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
}

module.exports = { sendAccessGrantedEmail };
