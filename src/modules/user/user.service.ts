import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import {
  UpdateUserDto,
  UserWithStats,
  AdminUserRow,
  UsageStats,
  DailyUsage,
  ConversationUsage,
  CreateAdminUserDto,
} from "./user.types";
import { passwordUtils } from "../../shared/utils/password";

// Prices from env with GPT-4o-mini defaults
const PRICE_INPUT_PER_1M = parseFloat(process.env.PRICE_INPUT_PER_1M ?? "0.15");
const PRICE_OUTPUT_PER_1M = parseFloat(
  process.env.PRICE_OUTPUT_PER_1M ?? "0.60",
);
const PRICE_WHISPER_PER_MIN = parseFloat(
  process.env.PRICE_WHISPER_PER_MIN ?? "0.006",
);
const PRICE_TTS_PER_1M_CHARS = parseFloat(
  process.env.PRICE_TTS_PER_1M_CHARS ?? "15.00",
);

function calcCost(
  inputTokens: number,
  outputTokens: number,
  audioSeconds: number,
  ttsChars: number,
): number {
  return (
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M +
    (audioSeconds / 60) * PRICE_WHISPER_PER_MIN +
    (ttsChars / 1_000_000) * PRICE_TTS_PER_1M_CHARS
  );
}

function periodBounds(period: "day" | "week" | "month" | "all"): {
  from: Date;
  prevFrom: Date;
  prevTo: Date;
} {
  const now = new Date();
  const from = new Date(now);
  if (period === "day") from.setHours(0, 0, 0, 0);
  if (period === "week") from.setDate(now.getDate() - 6);
  if (period === "month") from.setDate(now.getDate() - 29);
  if (period === "all") from.setFullYear(2000);

  const span = now.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from, prevFrom, prevTo };
}

export const userService = {
  async getUser(userId: string): Promise<UserWithStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
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

  // ── Admin methods ────────────────────────────────────────────────────────

  async listAllUsers(): Promise<AdminUserRow[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { books: true, conversations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map(({ _count, ...u }) => ({
      ...u,
      stats: {
        totalBooks: _count.books,
        totalConversations: _count.conversations,
      },
    }));
  },

  async createAdminUser(data: CreateAdminUserDto): Promise<AdminUserRow> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing)
      throw new AppError("Email already in use", StatusCodes.CONFLICT);

    const hashedPassword = await passwordUtils.hash(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        password: hashedPassword,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { books: true, conversations: true } },
      },
    });

    const { _count, ...rest } = user;
    return {
      ...rest,
      stats: {
        totalBooks: _count.books,
        totalConversations: _count.conversations,
      },
    };
  },

  async updateUserRole(
    targetId: string,
    role: "USER" | "ADMIN",
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
    await prisma.user.update({ where: { id: targetId }, data: { role } });
  },

  async updateAdminUser(
    targetId: string,
    data: { name?: string; email?: string },
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
    if (data.email && data.email !== user.email) {
      const conflict = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (conflict)
        throw new AppError("Email already in use", StatusCodes.CONFLICT);
    }
    await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email && { email: data.email }),
      },
    });
  },

  async toggleUserActive(targetId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isActive: !user.isActive },
      select: { isActive: true },
    });
    return updated.isActive;
  },

  async adminDeleteUser(targetId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
    await prisma.user.delete({ where: { id: targetId } });
  },

  async getUsageStats(
    userId: string,
    period: "day" | "week" | "month" | "all",
  ): Promise<UsageStats> {
    const { from, prevFrom, prevTo } = periodBounds(period);

    // ── Current period messages ──────────────────────────────────────────────
    const messages = await prisma.message.findMany({
      where: {
        createdAt: period === "all" ? undefined : { gte: from },
        conversation: { userId },
      },
      select: {
        role: true,
        content: true,
        inputTokens: true,
        outputTokens: true,
        audioSeconds: true,
        createdAt: true,
        conversationId: true,
      },
    });

    const totalInputTokens = messages.reduce((s, m) => s + m.inputTokens, 0);
    const totalOutputTokens = messages.reduce((s, m) => s + m.outputTokens, 0);
    const totalAudioSeconds = messages.reduce((s, m) => s + m.audioSeconds, 0);
    const totalTtsChars = messages
      .filter((m) => m.role === "assistant")
      .reduce((s, m) => s + m.content.length, 0);
    const totalCost = calcCost(
      totalInputTokens,
      totalOutputTokens,
      totalAudioSeconds,
      totalTtsChars,
    );

    // ── Previous period for delta ────────────────────────────────────────────
    let costDelta: number | null = null;
    let messagesDelta: number | null = null;

    if (period !== "all") {
      const prevMessages = await prisma.message.findMany({
        where: {
          createdAt: { gte: prevFrom, lte: prevTo },
          conversation: { userId },
        },
        select: {
          role: true,
          content: true,
          inputTokens: true,
          outputTokens: true,
          audioSeconds: true,
        },
      });

      const prevCost = calcCost(
        prevMessages.reduce((s, m) => s + m.inputTokens, 0),
        prevMessages.reduce((s, m) => s + m.outputTokens, 0),
        prevMessages.reduce((s, m) => s + m.audioSeconds, 0),
        prevMessages
          .filter((m) => m.role === "assistant")
          .reduce((s, m) => s + m.content.length, 0),
      );

      costDelta =
        prevCost > 0 ? ((totalCost - prevCost) / prevCost) * 100 : null;
      messagesDelta =
        prevMessages.length > 0
          ? ((messages.length - prevMessages.length) / prevMessages.length) *
            100
          : null;
    }

    // ── Daily breakdown ──────────────────────────────────────────────────────
    const dailyMap = new Map<string, DailyUsage>();

    for (const m of messages) {
      const date = m.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          inputTokens: 0,
          outputTokens: 0,
          audioSeconds: 0,
          cost: 0,
          messages: 0,
        });
      }
      const day = dailyMap.get(date)!;
      day.inputTokens += m.inputTokens;
      day.outputTokens += m.outputTokens;
      day.audioSeconds += m.audioSeconds;
      day.messages += 1;
      day.cost = calcCost(
        day.inputTokens,
        day.outputTokens,
        day.audioSeconds,
        messages
          .filter(
            (x) =>
              x.createdAt.toISOString().slice(0, 10) === date &&
              x.role === "assistant",
          )
          .reduce((s, x) => s + x.content.length, 0),
      );
    }

    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // ── Top conversations by cost ────────────────────────────────────────────
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        updatedAt: period === "all" ? undefined : { gte: from },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        book: { select: { title: true } },
        messages: {
          select: {
            role: true,
            content: true,
            inputTokens: true,
            outputTokens: true,
            audioSeconds: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const topConversations: ConversationUsage[] = conversations
      .map((c) => {
        const inp = c.messages.reduce((s, m) => s + m.inputTokens, 0);
        const out = c.messages.reduce((s, m) => s + m.outputTokens, 0);
        const audio = c.messages.reduce((s, m) => s + m.audioSeconds, 0);
        const tts = c.messages
          .filter((m) => m.role === "assistant")
          .reduce((s, m) => s + m.content.length, 0);
        return {
          id: c.id,
          title: c.title,
          bookTitle: c.book.title,
          messageCount: c.messages.length,
          inputTokens: inp,
          outputTokens: out,
          audioSeconds: audio,
          cost: calcCost(inp, out, audio, tts),
          updatedAt: c.updatedAt,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // ── Distinct conversation count in period ────────────────────────────────
    const conversationIds = new Set(messages.map((m) => m.conversationId));

    return {
      period,
      totalInputTokens,
      totalOutputTokens,
      totalAudioSeconds,
      totalCost,
      totalMessages: messages.length,
      totalConversations: conversationIds.size,
      dailyBreakdown,
      topConversations,
      costDelta,
      messagesDelta,
    };
  },
};
