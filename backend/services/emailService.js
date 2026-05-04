const nodemailer = require("nodemailer");

/**
 * Sends access notifications to users.
 * Wrapped in try/catch to ensure non-blocking failures.
 */
async function sendAccessNotification(email, action, catalog, schema, table) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const isGrant = action.toUpperCase().includes("GRANT") || action.toUpperCase().includes("DEPLOY");
    const resource = `${catalog}.${schema}.${table}`;
    const subject = isGrant 
      ? `Access Granted: ${resource}` 
      : `Access Revoked: ${resource}`;
    
    const host = (process.env.DATABRICKS_HOST || "").replace(/\/$/, "");
    const dataUrl = `${host}/explore/data/${catalog}/${schema}/${table}`;

    const text = isGrant
      ? `Hello,\n\nYou have been granted access to the following Databricks resource: ${resource}.\n\nYou can access it directly here:\n${dataUrl}\n\nBest regards,\nGovernance Portal Team`
      : `Hello,\n\nYour access to the following Databricks resource has been revoked: ${resource}.\n\nIf you believe this is an error, please contact your administrator.\n\nBest regards,\nGovernance Portal Team`;

    const html = isGrant
      ? `<p>Hello,</p>
         <p>You have been granted access to the following Databricks resource: <strong>${resource}</strong>.</p>
         <p><a href="${dataUrl}" style="display:inline-block; padding:10px 20px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">Open in Databricks</a></p>
         <p>Or copy this link: <br/> ${dataUrl}</p>
         <p>Best regards,<br/>Governance Portal Team</p>`
      : `<p>Hello,</p>
         <p>Your access to the following Databricks resource has been revoked: <strong>${resource}</strong>.</p>
         <p>If you believe this is an error, please contact your administrator.</p>
         <p>Best regards,<br/>Governance Portal Team</p>`;

    const info = await transporter.sendMail({
      from: `"Databricks Governance" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: subject,
      text: text,
      html: html
    });

    console.log(`[Email] Notification sent to ${email}: ${info.messageId}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send notification to ${email}:`, err.message);
  }
}

async function sendRLACNotification(email, rlacData) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const portalUrl = process.env.APP_URL || "http://localhost:3000";
    const subject = `Governance Enrollment: Row-Level Access Configured`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #1e3a5f;">Welcome to Databricks Governance</h2>
        <p>Hello,</p>
        <p>You have been enrolled in the Governance Portal with specific Row-Level Access Control (RLAC) policies.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Assigned Attributes:</strong></p>
          <ul style="margin: 10px 0 0; font-size: 14px; color: #0f172a;">
            <li><strong>Group:</strong> ${rlacData.groupcode || 'None'}</li>
            <li><strong>Cluster:</strong> ${rlacData.clustercode || 'None'}</li>
            <li><strong>Company:</strong> ${rlacData.companycode || 'None'}</li>
            <li><strong>Plant:</strong> ${rlacData.plantcode || 'None'}</li>
          </ul>
        </div>
        <p>Please log in to the portal to view your access and data:</p>
        <p><a href="${portalUrl}" style="display:inline-block; padding:12px 24px; background:#1e3a5f; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">Login to Governance Portal</a></p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">This is an automated notification. Please do not reply.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Databricks Governance" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: subject,
      html: html
    });

    console.log(`[Email] RLAC Notification sent to ${email}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send RLAC notification to ${email}:`, err.message);
  }
}

module.exports = { sendAccessNotification, sendRLACNotification };
