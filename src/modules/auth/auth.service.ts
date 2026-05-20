import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../shared/utils/jwt";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { LoginDto, AuthResponse, UpdateProfileDto } from "./auth.types";

const REFRESH_TOKEN_TTL_DAYS = 7;

export const authService = {
  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: { email: data.email, name: data.name },
    });

    const tokens = jwtUtils.generateTokens({
      userId: user.id,
      email: user.email,
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
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
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
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
      select: { id: true, name: true, email: true, createdAt: true },
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
      select: { id: true, name: true, email: true, createdAt: true },
    });
  },
};
