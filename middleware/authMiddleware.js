

const validateToken = async (req, res, next) => {
  try {
    const authHeader = req?.headers?.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log({token});
    

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    // jose import
    const { jwtVerify, createRemoteJWKSet } = await import("jose");

    // Better Auth JWKS endpoint
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    );

    // Verify token
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.CLIENT_URL}`,
      audience: `${process.env.CLIENT_URL}`,
    });

    // Verified user/token information
    req.user = payload;

    next();
  } catch (error) {
    console.error("Token validation failed:", error.message);

    if (error.code === "ERR_JWT_EXPIRED") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

module.exports = validateToken;