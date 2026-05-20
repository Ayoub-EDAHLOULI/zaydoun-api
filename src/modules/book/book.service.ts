import path from "path";
import fs from "fs/promises";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { CreateBookDto, BookSummary, BookDetail } from "./book.types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "books");

export const bookService = {
  async listBooks(userId: string): Promise<BookSummary[]> {
    return prisma.book.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        author: true,
        language: true,
        totalPages: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getBook(bookId: string, userId: string): Promise<BookDetail> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        userId: true,
        title: true,
        author: true,
        language: true,
        totalPages: true,
        storagePath: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            chunks: true,
            conversations: true,
          },
        },
      },
    });

    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    const { _count, userId: _uid, ...rest } = book;

    return {
      ...rest,
      stats: {
        totalChunks: _count.chunks,
        totalConversations: _count.conversations,
      },
    };
  },

  async uploadBook(
    userId: string,
    file: Express.Multer.File,
    data: CreateBookDto,
  ): Promise<BookSummary> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(filePath, file.buffer);

    const storagePath = `/uploads/books/${filename}`;

    const book = await prisma.book.create({
      data: {
        userId,
        title: data.title,
        author: data.author,
        language: data.language ?? "ar",
        totalPages: 0,
        storagePath,
        status: "PENDING",
      },
      select: {
        id: true,
        title: true,
        author: true,
        language: true,
        totalPages: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return book;
  },

  async deleteBook(bookId: string, userId: string): Promise<void> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });

    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), "public", book.storagePath);
      await fs.unlink(filePath);
    } catch {
      // File may already be gone — non-fatal
    }

    await prisma.book.delete({ where: { id: bookId } });
  },
};
