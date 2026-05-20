export const jwtConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "15m", // 15 minutes
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d", // 7 days
};

if (!jwtConfig.accessTokenSecret || !jwtConfig.refreshTokenSecret) {
  throw new Error(
    "FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in environment variables.",
  );
}
