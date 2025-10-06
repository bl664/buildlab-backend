// routes/auth/verifyEmail.js
const express = require('express');
const { getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
const { verifyEmailToken, markUserAsVerified, resendVerificationEmail, updateUnverifiedEmail } = require('../../../services/userVerifyService');
const { setAuthCookies } = require('../../../services/cookieService');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
const { storeRefreshToken, getUserProfile, updateFailedLogin, } = require('../../../services/userAuthService');
const APP_CONFIG = require('../../../../config');
const emailService = require('../../../services/emailServices');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Verify email with token
router.post('/', async (req, res) => {
  let client;
  try {
    const { token } = req.query;
    const { email, password } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });


    client = await getTransactionClient();

    // Verify token
    const verification = await verifyEmailToken(token, client);
    console.log("verification is ", verification);

    if (!verification.success) {
      console.log("verification failed");
      await rollbackTransaction(client);
      client = null; // prevent double release

      if (verification.expired) {
        return res.status(410).json({
          error: verification.error,
          expired: true,
          email: verification.email,
          action: 'resend'
        });
      }

      if (verification.alreadyVerified) {
        console.log("email is verified");
        return res.status(200).json({
          message: 'Email already verified. Please sign in.',
          action: 'signin'
        });
      }

      return res.status(400).json({ error: verification.error });
    }

    if (verification.lockout_until && new Date(verification.lockout_until) > new Date()) {
  await rollbackTransaction(client);
  client = null;

  const now = new Date();
  const lockoutUntil = new Date(verification.lockout_until);
  const diffMs = lockoutUntil - now; // difference in milliseconds
  const diffMinutes = Math.ceil(diffMs / 60000); // convert to minutes

  const humanReadable = diffMinutes > 1
    ? `Your account is temporarily locked. Try again in ${diffMinutes} minutes.`
    : `Your account is temporarily locked. Try again in less than a minute.`;

  console.log('signin_account_locked', { userId: verification.userId, ip: req.ip });

  return res.status(423).json({ error: humanReadable });
}


    // Check password
    const userPassword = verification.password;
    const userEmail = verification.email;

    const isValidPassword = await bcrypt.compare(password, userPassword);
    const isValidEmail = userEmail === email;

    console.log("creds validation is ", isValidEmail, isValidPassword);
    console.log("passwords are", userPassword, password);

    if (!(isValidEmail && isValidPassword)) {
      const user = {
        failed_login_attempts: verification.failed_login_attempts,
        id: verification.userId
      };
      console.log("user is ", user);

      await updateFailedLogin(user, client);
      await commitTransaction(client);
      client = null;

      return res.status(400).json({
        error: 'There is mismatched credentials. Please enter correct credentials'
      });
    }

    // Mark as verified
    await markUserAsVerified(verification.userId, client);

    // Get user profile
    const profile = await getUserProfile(verification.userId, client);

    // Generate tokens
    const payload = {
      userId: profile.id || verification.userId,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME
    };
    console.log("payload is ", payload);

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    await storeRefreshToken(verification.userId, refreshToken, client);

    await commitTransaction(client);
    client = null;

    // Set auth cookies
    setAuthCookies(res, accessToken, refreshToken);

    let redirectUrl;
    if (payload.role === 'student') redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
    else if (payload.role === 'mentor') redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
    else redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';

    console.log("email verified and authenticated");

    return res.status(200).json({
      message: 'Email verified successfully!',
      action: 'redirect_home',
      user: {
        email: profile.email,
        name: profile.name,
        role: profile.role
      },
      redirectUrl
    });

  } catch (error) {
    if (client) {
      await rollbackTransaction(client);
      client = null;
    }
    console.error('Email verification error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend', async (req, res) => {
  let client;
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    client = await getTransactionClient();

    const result = await resendVerificationEmail(email, client);

    if (!result.success) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: result.error });
    }

    // Send email
    try {
      await emailService.sendVerificationEmail(
        result.email,
        result.token,
        `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${result.token}`
      );
    } catch (err) {
      console.error('Email send failed:', err.message);
      await rollbackTransaction(client);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    await commitTransaction(client);

    return res.status(200).json({
      message: 'Verification email sent successfully. Please check your inbox.',
      action: 'check_email'
    });

  } catch (error) {
    if (client) await rollbackTransaction(client);
    console.error('Resend verification error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update email for unverified account
router.post('/update-email', async (req, res) => {
  let client;
  try {
    const { oldEmail, newEmail, token } = req.body;

    if (!oldEmail || !newEmail || !token) {
      return res.status(400).json({ 
        error: 'Old email, new email, and verification token are required' 
      });
    }

    // Validate new email format
    const { isEmailValid } = require('../../../utils/email');
    if (!isEmailValid(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    client = await getTransactionClient();

    const result = await updateUnverifiedEmail(oldEmail, newEmail, token, client);

    if (!result.success) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: result.error });
    }

    // Send verification email to new address
    try {
      await emailService.sendVerificationEmail(
        newEmail,
        result.token,
        `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${result.token}`
      );
    } catch (err) {
      console.error('Email send failed:', err.message);
      await rollbackTransaction(client);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    await commitTransaction(client);

    return res.status(200).json({
      message: `Email updated successfully. Verification email sent to ${newEmail}.`,
      action: 'check_email',
      newEmail
    });

  } catch (error) {
    if (client) await rollbackTransaction(client);
    console.error('Update email error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// ===== REGISTER THE ROUTES IN YOUR MAIN APP =====
// In your main app.js or routes/auth/index.js:
/*
const verifyEmailRouter = require('./routes/auth/verifyEmail');

app.use('/api/auth/verify/email', verifyEmailRouter);
*/
// // routes/auth/verify.js
// const express = require('express');
// const crypto = require('crypto');
// const { setAuthCookies } = require('../../../services/cookieService');
// const { storeRefreshToken, getUserProfile } = require('../../../services/userAuthService');
// const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
// const { queryDatabase, getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
// const APP_CONFIG = require('../../../../config')
// const router = express.Router();

// router.post('/', async (req, res) => {
//   console.log("verifying...")
//   const { token } = req.query;
//   if (!token) return res.status(400).json({ error: 'Invalid verification link.' });
// // console.log("token is ", token)
//   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
// let client;
//   try {
//     console.log("fetching user")
//     //client = await getTransactionClient();

//     const findTokenQuery = `
//       SELECT u.id, u.verified, uai.verification_token_expires
//       FROM users_additional_info uai
//       JOIN users u ON u.id = uai.user_id
//       WHERE uai.verification_token = $1
//     `;
// // console.log("token hash ", tokenHash)
//     const [user] = await queryDatabase(findTokenQuery, [tokenHash]);

//     if (!user) {
//       console.log("no user found")
//       return res.status(400).json({ error: 'Invalid or expired verification link.' });
//     }
// // console.log("user is ", user)
//     if (user.verified) {
//       return res.status(400).json({ error: 'Email already verified.' });
//     }
// // console.log("user is verified")
//     if (new Date(user.verification_token_expires) < new Date()) {
//       return res.status(400).json({ error: 'Verification link has expired.' });
//     }

//     const updateUserQuery = `
//       UPDATE users
//       SET verified = TRUE
//       WHERE id = $1
//     `;
//     await queryDatabase(updateUserQuery, [user.id]);
// // console.log("updated")
//     // Optionally, delete the token record so it can't be reused
//     const deleteTokenQuery = `
//       DELETE FROM users_additional_info
//       WHERE user_id = $1
//     `;
//     await queryDatabase(deleteTokenQuery, [user.id]);
// // console.log("deleted")
//     const profile = await getUserProfile(user.id);
//     console.log("profile is ", profile)
//      const payload = { userId: user.id, email: profile.email, name: profile.name, role: profile.role };
//      console.log("payload", payload)
//       const accessToken = generateAccessToken(payload);
//       const refreshToken = generateRefreshToken(payload);

//       await storeRefreshToken(user.id, refreshToken, null);
// // console.log("stored auth cookie")
//       setAuthCookies(res, accessToken, refreshToken);
// // console.log("set auth cookie")
//       const safeUserData = {
//         id: user.id,
//         email: profile.email,
//         name: profile.name,
//         role: profile.role,
//         created_at: profile.created_at,
//       };
// // console.log("safe uyser is ", safeUserData)
//       let redirectUrl;
//       if (safeUserData.role === 'student') {
//         redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
//       }
//       else if (safeUserData.role === 'mentor') {
//         redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
//       }
//       else {
//         redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
//       }
// // console.log("redirect url", redirectUrl)
//     return res.status(200).json({ message: 'Email verified successfully!', redirectUrl });
//   } catch (error) {
//     console.error('Email verification error:', error.message);
//     // await rollbackTransaction(client)
//     return res.status(500).json({ error: 'Internal server error.' });
//   }
// });

// module.exports = router;

//      /*  const profile = await getUserProfile(newUser.id, null);

//       const payload = { userId: newUser.id, email: profile.email, name: profile.name, role: profile.role };
//       const accessToken = generateAccessToken(payload);
//       const refreshToken = generateRefreshToken(payload);

//       await storeRefreshToken(newUser.id, refreshToken, null);

//       setAuthCookies(res, accessToken, refreshToken);

//       const safeUserData = {
//         id: newUser.id,
//         email: profile.email,
//         name: profile.name,
//         role: profile.role,
//         created_at: profile.created_at,
//       };

//       let redirectUrl;
//       if (safeUserData.role === 'student') {
      //   await emailService.sendVerificationEmail(email, verificationToken, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS);
      //   redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
      // }
      // else if (safeUserData.role === 'mentor') {
      //   await emailService.sendVerificationEmail(email, verificationToken, APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS);
      //   redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
      // }
      // else {
      //   redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
      // }  */