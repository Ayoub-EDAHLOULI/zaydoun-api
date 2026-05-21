import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../shared/utils/jwt";
import { passwordUtils } from "../../shared/utils/password";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UpdateProfileDto,
  ChangePasswordDto,
} from "./auth.types";

const REFRESH_TOKEN_TTL_DAYS = 7;

const refreshTokenExpiry = () =>
  new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const userSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
};

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
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: refreshTokenExpiry(),
      },
    });

    return { user, accessToken: tokens.accessToken };
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        name: true,
        email: true,
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
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: refreshTokenExpiry(),
      },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: tokens.accessToken,
    };
  },

  async refreshToken(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw new AppError(
        "Session expired, please login again",
        StatusCodes.UNAUTHORIZED,
      );
    }

    const tokens = jwtUtils.generateTokens({
      userId: session.user.id,
      email: session.user.email,
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
