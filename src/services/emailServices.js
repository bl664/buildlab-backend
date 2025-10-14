const nodemailer = require("nodemailer");
const APP_CONFIG = require("../../config");

function createTransporter() {
  const port = Number(APP_CONFIG.EMAIL_PORT);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host: APP_CONFIG.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: APP_CONFIG.EMAIL_USER,
      pass: APP_CONFIG.EMAIL_PASS,
    },
  });
  return transporter;
}

const transporter = createTransporter();

const emailService = {
  sendVerificationEmail: async (email, token, url) => {
    const verificationUrl = url;
    const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (match, start, middle) =>
      start + '*'.repeat(middle.length)
    );

    const mailOptions = {
      from: `"BuildLab Team" <${APP_CONFIG.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Email - Buildlab",
      text: `
        Hi there!

        We're excited to have you on board! To complete your registration and ensure the security of your account, please verify your email address.

        Verify your email by clicking this link:
        ${verificationUrl}

        IMPORTANT: This verification link will expire in 15 minutes for security reasons.

        Wrong email address?
        If you entered the wrong email, you can update it by visiting:
        ${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${token}#update-email

        If you didn't create an account with us, you can safely ignore this email. No account will be created without verification.

        Need help? Contact us at support@buildlab.com

        © 2025 Buildlab. All rights reserved.
      `.trim(),
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, rgb(96,47,157) 0%, rgb(126,77,197) 100%); padding: 50px 40px; text-align: center;">
                      <div style="width: 80px; height: 80px; background-color: #2DD4BF; border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 40px;">✉️</span>
                      </div>
                      <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 600;">Verify Your Email</h1>
                      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Welcome to Buildlab!</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 50px 40px;">
                      <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                        Hi there! 👋
                      </p>
                      
                      <p style="margin: 0 0 25px; color: #333; font-size: 16px; line-height: 1.6;">
                        We're excited to have you on board! To complete your registration and ensure the security of your account, please verify your email address.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 35px;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; padding: 16px 45px; background: linear-gradient(135deg, rgb(96,47,157) 0%, rgb(126,77,197) 100%); color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 8px 20px rgba(96, 47, 157, 0.3);">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Info boxes -->
                      <div style="background-color: #f8f5fc; border-left: 4px solid rgb(96,47,157); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                          <strong style="color: rgb(96,47,157);">⏰ Important:</strong> This verification link will expire in 15 minutes for security reasons.
                        </p>
                      </div>

                      <div style="background-color: #fff9e6; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <p style="margin: 0 0 10px; color: #666; font-size: 14px; line-height: 1.6;">
                          <strong style="color: #f57c00;">📧 Wrong email address?</strong>
                        </p>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                          If you entered the wrong email, you can update it by visiting:<br>
                          <a href="${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${token}#update-email" style="color: rgb(96,47,157); text-decoration: none; font-weight: 600;">Update Email Address</a>
                        </p>
                      </div>
                      
                      <!-- Alternative link -->
                      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <p style="margin: 0 0 10px; color: #666; font-size: 13px;">
                          <strong>Can't click the button?</strong> Copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0; color: #999; font-size: 12px; word-break: break-all;">
                          ${verificationUrl}
                        </p>
                      </div>
                      
                      <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6;">
                        If you didn't create an account with us, you can safely ignore this email. No account will be created without verification.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0 0 10px; color: #666; font-size: 13px;">
                        Need help? Contact us at <a href="mailto:support@buildlab.com" style="color: rgb(96,47,157); text-decoration: none;">support@buildlab.com</a>
                      </p>
                      <p style="margin: 0 0 10px; color: #999; font-size: 13px;">
                        This is an automated message, please do not reply.
                      </p>
                      <p style="margin: 0; color: #bbb; font-size: 12px;">
                        © 2025 Buildlab. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      headers: {
        'X-Entity-Ref-ID': `verification-${token}`,
        'X-Mailer': 'Buildlab Mailer',
        'List-Unsubscribe': `<mailto:unsubscribe@buildlab.com?subject=unsubscribe>`,
        'Precedence': 'bulk',
      },
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send verification email to ${email}:`, err.message);
      throw err;
    }
  },

  sendPasswordResetEmail: async (email, token, resetUrl) => {

    const mailOptions = {
      from: `"Buildlab" <${APP_CONFIG.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Buildlab",
      text: `
      Reset Your Password
      You requested to reset your password. Click the link below to create a new password:
      ${resetUrl}
      ⏰ This link will expire in 1 hour.
      If you didn't request this, please ignore this email. Your password will remain unchanged.
      © 2025 Buildlab. All rights reserved.
      `.trim(),
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 50px 40px; text-align: center;">
                      <div style="width: 80px; height: 80px; background-color: #fff; border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 40px;">🔐</span>
                      </div>
                      <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 600;">Reset Your Password</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 50px 40px;">
                      <p style="margin: 0 0 25px; color: #333; font-size: 16px; line-height: 1.6;">
                        You requested to reset your password. Click the button below to create a new password:
                      </p>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 35px;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; padding: 16px 45px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                          <strong>⏰ This link will expire in 1 hour.</strong>
                        </p>
                      </div>
                      <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6;">
                        If you didn't request this, please ignore this email. Your password will remain unchanged.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center;">
                      <p style="margin: 0; color: #bbb; font-size: 12px;">
                        © 2025 Buildlab. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      headers: {
        'X-Entity-Ref-ID': `password-reset-${token}`,
        'X-Mailer': 'Buildlab Mailer',
        'List-Unsubscribe': `<mailto:unsubscribe@buildlab.com?subject=unsubscribe>`,
        'Precedence': 'bulk',
      },
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send password reset email to ${email}:`, err.message);
      throw err;
    }
  },

  // New: Send email update confirmation
  sendEmailUpdateConfirmation: async (oldEmail, newEmail) => {
    const mailOptions = {
      from: `"Buildlab" <${APP_CONFIG.EMAIL_USER}>`,
      to: oldEmail,
      subject: "Email Address Updated - Buildlab",
      text: `
        Email Address Updated
        Your Buildlab account email has been updated from ${oldEmail} to ${newEmail}.
        If you didn't make this change, please contact support immediately at support@buildlab.com.
        © 2025 Buildlab. All rights reserved.
      `.trim(),
      html: `
        <h2>Email Address Updated</h2>
        <p>Your Buildlab account email has been updated from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `,
      headers: {
        'X-Mailer': 'Buildlab Mailer',
        'List-Unsubscribe': `<mailto:unsubscribe@buildlab.com?subject=unsubscribe>`,
      },
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email update notification sent to ${oldEmail}`);
    } catch (err) {
      console.error(`❌ Failed to send email update notification:`, err.message);
    }
  },
};

module.exports = emailService;
