const nodemailer = require("nodemailer");

/**
 * Sends access notifications to users.
 * Wrapped in try/catch to ensure non-blocking failures.
 */
async function sendAccessNotification(email, action, resource) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USERNAME, // Matches .env
        pass: process.env.SMTP_PASSWORD, // Matches .env
      },
    });

    const isGrant = action.toUpperCase() === "GRANT";
    const subject = isGrant 
      ? `Access Granted: ${resource}` 
      : `Access Revoked: ${resource}`;
    
    const text = isGrant
      ? `Hello,\n\nYou have been granted access to the following Databricks resource: ${resource}.\n\nYou can now browse this data directly in your Databricks workspace.\n\nBest regards,\nGovernance Portal Team`
      : `Hello,\n\nYour access to the following Databricks resource has been revoked: ${resource}.\n\nIf you believe this is an error, please contact your administrator.\n\nBest regards,\nGovernance Portal Team`;

    const info = await transporter.sendMail({
      from: `"Databricks Governance" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: subject,
      text: text,
    });

    console.log(`[Email] Notification sent to ${email}: ${info.messageId}`);
  } catch (err) {
    console.error(`[Email Error] Failed to send notification to ${email}:`, err.message);
  }
}

module.exports = { sendAccessNotification };
