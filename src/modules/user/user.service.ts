import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { UpdateUserDto, UserWithStats } from "./user.types";

export const userService = {
  async getUser(userId: string): Promise<UserWithStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            books: true,
            conversations: true,
          },
        },
      },
    });

    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

    const { _count, ...rest } = user;

    return {
      ...rest,
      stats: {
        totalBooks: _count.books,
        totalConversations: _count.conversations,
      },
    };
  },

  async updateUser(userId: string, data: UpdateUserDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

    return prisma.user.update({
      where: { id: userId },
      data: { ...(data.name && { name: data.name }) },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

    await prisma.user.delete({ where: { id: userId } });
  },
};
