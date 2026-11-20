const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const createAccessToken = (userId) => {
  return jwt.sign(
    {
      sub: userId,
      type: "access",
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_TTL,
      issuer: "auth-node-service",
      audience: "auth-node-service-client",
    },
  );
};

const createRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    {
      sub: userId,
      jti: sessionId,
      type: "refresh",
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: `${process.env.REFRESH_TOKEN_TTL_SECONDS}s`,
      issuer: "auth-node-service",
      audience: "auth-node-service-client",
    },
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
    issuer: "auth-node-service",
    audience: "auth-node-service-client",
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
    issuer: "auth-node-service",
    audience: "auth-node-service-client",
  });
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createSessionId = () => {
  return crypto.randomUUID();
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  createSessionId,
};
