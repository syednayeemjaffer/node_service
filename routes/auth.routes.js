const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  requestRegistrationOtp,
  login,
  refresh,
  logout,
  getMe,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Try again later.",
  },
});

router.post("/request-registration-otp", authLimiter, requestRegistrationOtp);
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

module.exports = router;
