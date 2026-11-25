const { verifyAccessToken } = require("../utils/tokens");

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Insufficient permissions" });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
};
