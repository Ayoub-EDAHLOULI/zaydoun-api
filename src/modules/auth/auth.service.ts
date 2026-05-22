import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../shared/utils/jwt";
import { passwordUtils } from "../../shared/utils/password";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { emailService } from "../../services/email/email.service";
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UpdateProfileDto,
  ChangePasswordDto,
} from "./auth.types";

const REFRESH_TOKEN_TTL_DAYS = 7;
const MAX_SESSIONS_PER_USER = 3;

const refreshTokenExpiry = () =>
  new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

// Enforces session cap: deletes oldest sessions beyond MAX_SESSIONS_PER_USER, then creates a new one
async function createSession(userId: string, refreshToken: string) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (sessions.length >= MAX_SESSIONS_PER_USER) {
    const toDelete = sessions.slice(
      0,
      sessions.length - MAX_SESSIONS_PER_USER + 1,
    );
    await prisma.session.deleteMany({
      where: { id: { in: toDelete.map((s) => s.id) } },
    });
  }

  await prisma.session.create({
    data: { userId, refreshToken, expiresAt: refreshTokenExpiry() },
  });
}

export const authService = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing)
      throw new AppError("Email already in use", StatusCodes.CONFLICT);

    const hashedPassword = await passwordUtils.hash(data.password);

    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hashedPassword },
      select: userSelect,
    });

    const tokens = jwtUtils.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await createSession(user.id, tokens.refreshToken);

    // Fire-and-forget — don't let email failure block registration
    void emailService.sendWelcomeEmail(user.email, user.name ?? user.email);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user)
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);

    const isValid = await passwordUtils.compare(data.password, user.password);
    if (!isValid)
      throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);

    const tokens = jwtUtils.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async refreshToken(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw new AppError(
        "Session expired, please login again",
        StatusCodes.UNAUTHORIZED,
      );
    }

    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      // In development all browsers share the same cookie jar on localhost.
      // Rotating the refresh token here would invalidate every other open tab/browser.
      // Issue a fresh accessToken while keeping the existing refresh token and session intact.
      const accessToken = jwtUtils.generateAccessToken({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      });

      // Slide the expiry so the session stays alive
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: refreshTokenExpiry() },
      });

      return { accessToken, refreshToken };
    }

    // Production: full rotation — each device has its own cookie
    const tokens = jwtUtils.generateTokens({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: refreshTokenExpiry(),
      },
    });

    return tokens;
  },

  async logout(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

    return prisma.user.update({
      where: { id: userId },
      data: { ...(data.name && { name: data.name }) },
      select: userSelect,
    });
  },

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

    const isValid = await passwordUtils.compare(
      data.currentPassword,
      user.password,
    );
    if (!isValid)
      throw new AppError(
        "Current password is incorrect",
        StatusCodes.BAD_REQUEST,
      );

    const hashed = await passwordUtils.hash(data.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  },
};
