const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { redisClient } = require("../config/redis");
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashToken,
  createSessionId,
} = require("../utils/tokens");

// Helper functions
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  maxAge: Number(process.env.REFRESH_TOKEN_TTL_SECONDS) * 1000,
  path: "/api/auth",
};

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

const createTokensAndSession = async (userId, role) => {
  const sessionId = createSessionId();

  const accessToken = createAccessToken(userId, role);
  const refreshToken = createRefreshToken(userId, sessionId);

  await redisClient.set(
    `refresh_session:${sessionId}`,
    hashToken(refreshToken),
    {
      EX: Number(process.env.REFRESH_TOKEN_TTL_SECONDS),
    },
  );

  return { accessToken, refreshToken };
};

const registrationOtpKey = (email) => `registration_otp:${email.toLowerCase()}`;

const requestRegistrationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!validEmail(email)) {
      return res.status(400).json({ success: false, message: "Provide a valid email" });
    }

    const normalizedEmail = email.toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await redisClient.set(registrationOtpKey(normalizedEmail), hashToken(otp), {
      EX: Number(process.env.REGISTRATION_OTP_TTL_SECONDS || 600),
    });

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: "Your account verification code",
      text: `Your verification code is ${otp}. It expires in ${Math.floor(Number(process.env.REGISTRATION_OTP_TTL_SECONDS || 600) / 60)} minutes.`,
    });

    return res.status(200).json({ success: true, message: "Verification code sent" });
  } catch (error) {
    next(error);
  }
};

// Implementation
const register = async (req, res, next) => {
  try {
    const { name, address = "", email, password, otp } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof address !== "string" ||
      address.trim().length > 250
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a name (up to 100 characters) and an address (up to 250 characters)",
      });
    }

    if (!validEmail(email) || !validPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid email and a password between 12 and 72 bytes",
      });
    }

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "A valid 6-digit verification code is required" });
    }

    const normalizedEmail = email.toLowerCase();
    const otpKey = registrationOtpKey(normalizedEmail);
    const storedOtpHash = await redisClient.get(otpKey);
    if (!storedOtpHash || storedOtpHash !== hashToken(otp)) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      address: address.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });
    await redisClient.del(otpKey);
    res.status(201).json({
      success: true,
      message: "Account created. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email & password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { accessToken, refreshToken } = await createTokensAndSession(user.id, user.role);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        address: user.address,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    let payload;

    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch {
      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
    console.log('Payload:',payload);
    if (payload.type !== "refresh" || !payload.jti) {
      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const key = `refresh_session:${payload.jti}`;
    const storedTokenHash = await redisClient.get(key);

    if (storedTokenHash !== hashToken(oldRefreshToken)) {
      await redisClient.del(key);
      res.clearCookie("refreshToken", refreshCookieOptions);

      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid",
      });
    }

    // Rotation: invalidate the old token before issuing a new one.
    await redisClient.del(key);

    const user = await User.findById(payload.sub).select("role");
    if (!user) {
      await redisClient.del(key);
      res.clearCookie("refreshToken", refreshCookieOptions);
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }
    const { accessToken, refreshToken } = await createTokensAndSession(user.id, user.role);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);

        if (payload.jti) {
          await redisClient.del(`refresh_session:${payload.jti}`);
        }
      } catch {
        // Always clear the browser cookie, even if it is expired or invalid.
      }
    }

    res.clearCookie("refreshToken", refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        address: user.address,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  requestRegistrationOtp,
  login,
  refresh,
  logout,
  getMe,
};
