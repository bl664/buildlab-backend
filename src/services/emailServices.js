const nodemailer = require("nodemailer");
const APP_CONFIG = require("../../config");

function createTransporter() {
  const port = Number(APP_CONFIG.EMAIL_PORT);
  const secure = port === 465; // SSL for 465, STARTTLS otherwise

  const transporter = nodemailer.createTransport({
    host: APP_CONFIG.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: APP_CONFIG.EMAIL_USER,
      pass: APP_CONFIG.EMAIL_PASS,
    },
  });


  // Verify SMTP connection
  transporter.verify((err, success) => {
    console.log("creds are",  APP_CONFIG.EMAIL_HOST, port, secure, APP_CONFIG.EMAIL_USER, APP_CONFIG.EMAIL_PASS)
    if (err) {
      console.error("❌ SMTP verification failed:", err.message);
    } else {
      console.log("✅ SMTP ready to send emails");
    }
  });

  return transporter;
}

const transporter = createTransporter();

const emailService = {
  sendVerificationEmail: async (email, token, url) => {
    const verificationUrl = `${url}`;
console.log("email services", email, token, url)
    const mailOptions = {
      from: APP_CONFIG.EMAIL_USER,
      to: email,
      subject: "Verify your Email - Buildlab",
      html: `
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
        <tr>
                        <td style="background: linear-gradient(135deg, rgb(96,47,157) 0%, rgb(126,77,197) 100%); padding: 50px 40px; text-align: center;">
                            <div style="width: 80px; height: 80px; background-color: #2DD4BF; border-radius: 12px; margin: 0 auto 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); padding-top: 20px;">
                                <div style="font-size: 40px; line-height: 40px; text-align: center;">📩</div>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Verify Your Email</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px;">
                            <p style="margin: 0 0 25px; color: #333; font-size: 16px; line-height: 1.6;">
                                Welcome! We're excited to have you on board. To complete your registration and ensure the security of your account, please verify your email address.
                            </p>
                            
                            <p style="margin: 0 0 35px; color: #666; font-size: 15px; line-height: 1.6;">
                                Click the button below to verify your email address:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 35px;">
                                        <a href="${verificationUrl}" 
                                           style="display: inline-block; padding: 16px 45px; background: linear-gradient(135deg, rgb(96,47,157) 0%, rgb(126,77,197) 100%); color: white; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 8px 20px rgba(96, 47, 157, 0.3); transition: all 0.3s ease;">
                                           Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Info box -->
                            <div style="background-color: #f8f5fc; border-left: 4px solid rgb(96,47,157); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                    <strong style="color: rgb(96,47,157);">⏰ Important:</strong> This verification link will expire in 24 hours for security reasons.
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
                            <p style="margin: 0 0 10px; color: #999; font-size: 13px;">
                                This is an automated message, please do not reply.
                            </p>
                            <p style="margin: 0; color: #bbb; font-size: 12px;">
                                © 2025 Your Company. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send verification email to ${email}:`, err.message);
      throw err; // let caller handle rollback if needed
    }
  },

  sendPasswordResetEmail: async (email, token) => {
    const resetUrl = `${APP_CONFIG.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      from: APP_CONFIG.EMAIL_USER,
      to: email,
      subject: "Reset Your Password - Buildlab",
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">
           Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send password reset email to ${email}:`, err.message);
      throw err;
    }
  },
};

module.exports = emailService;
