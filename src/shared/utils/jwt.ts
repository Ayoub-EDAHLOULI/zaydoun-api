import jwt, { SignOptions } from "jsonwebtoken";
import { jwtConfig } from "../config/jwt";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export const jwtUtils = {
  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(payload: JwtPayload): string {
    // We explicitly cast the expiresIn to satisfy TypeScript
    const signInOptions: SignOptions = {
      expiresIn: jwtConfig.accessTokenExpiry as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, jwtConfig.accessTokenSecret, signInOptions);
  },

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(payload: JwtPayload): string {
    const signInOptions: SignOptions = {
      expiresIn: jwtConfig.refreshTokenExpiry as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, jwtConfig.refreshTokenSecret, signInOptions);
  },

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, jwtConfig.accessTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  },

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, jwtConfig.refreshTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  },

  /**
   * Generate both tokens
   */
  generateTokens(payload: JwtPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  },
};
