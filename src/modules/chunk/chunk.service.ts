import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { ChunkData, CreateChunkDto, ChunkSearchResult } from "./chunk.types";

// pgvector expects '[0.1,0.2,...]' — Prisma.raw injects it unquoted into the SQL
const toVector = (embedding: number[]) =>
  Prisma.raw(`'[${embedding.join(",")}]'::vector`);

export const chunkService = {
  async createChunks(chunks: CreateChunkDto[]): Promise<void> {
    const queries = chunks.map((chunk) => {
      const vec = toVector(chunk.embedding);
      return prisma.$executeRaw`
        INSERT INTO chunks (id, book_id, page_number, chunk_index, content, token_count, embedding, created_at)
        VALUES (
          gen_random_uuid(),
          ${chunk.bookId}::uuid,
          ${chunk.pageNumber},
          ${chunk.chunkIndex},
          ${chunk.content},
          ${chunk.tokenCount},
          ${vec},
          NOW()
        )
        ON CONFLICT (book_id, page_number, chunk_index) DO UPDATE
        SET content     = EXCLUDED.content,
            token_count = EXCLUDED.token_count,
            embedding   = EXCLUDED.embedding
      `;
    });

    await prisma.$transaction(queries);
  },

  async getChunksByBook(bookId: string, userId: string): Promise<ChunkData[]> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    return prisma.chunk.findMany({
      where: { bookId },
      select: {
        id: true,
        bookId: true,
        pageNumber: true,
        chunkIndex: true,
        content: true,
        tokenCount: true,
        createdAt: true,
      },
      orderBy: [{ pageNumber: "asc" }, { chunkIndex: "asc" }],
    });
  },

  async getChunksByPage(
    bookId: string,
    pageNumber: number,
    userId: string,
  ): Promise<ChunkData[]> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    return prisma.chunk.findMany({
      where: { bookId, pageNumber },
      select: {
        id: true,
        bookId: true,
        pageNumber: true,
        chunkIndex: true,
        content: true,
        tokenCount: true,
        createdAt: true,
      },
      orderBy: { chunkIndex: "asc" },
    });
  },

  // Multi-tenant vector search: JOIN enforces ownership at the DB level so one
  // user's query can never surface chunks from another user's private library.
  async searchChunks(
    bookId: string,
    queryEmbedding: number[],
    userId: string,
    pageNumber?: number,
    topK: number = 5,
  ): Promise<ChunkSearchResult[]> {
    const vec = toVector(queryEmbedding);

    if (pageNumber != null) {
      const rows = await prisma.$queryRaw<ChunkSearchResult[]>`
        SELECT c.id,
               c.book_id::text            AS "bookId",
               c.page_number              AS "pageNumber",
               c.chunk_index              AS "chunkIndex",
               c.content,
               1 - (c.embedding <=> ${vec}) AS similarity
        FROM   chunks c
        JOIN   books  b ON c.book_id = b.id
        WHERE  b.id      = ${bookId}::uuid
          AND  b.user_id = ${userId}::uuid
          AND  c.page_number = ${pageNumber}
          AND  c.embedding  IS NOT NULL
        ORDER BY c.embedding <=> ${vec}
        LIMIT  ${topK}
      `;

      if (rows.length === 0)
        throw new AppError("Book not found", StatusCodes.NOT_FOUND);

      return rows;
    }

    const rows = await prisma.$queryRaw<ChunkSearchResult[]>`
      SELECT c.id,
             c.book_id::text            AS "bookId",
             c.page_number              AS "pageNumber",
             c.chunk_index              AS "chunkIndex",
             c.content,
             1 - (c.embedding <=> ${vec}) AS similarity
      FROM   chunks c
      JOIN   books  b ON c.book_id = b.id
      WHERE  b.id      = ${bookId}::uuid
        AND  b.user_id = ${userId}::uuid
        AND  c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vec}
      LIMIT  ${topK}
    `;

    if (rows.length === 0)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    return rows;
  },

  async deleteChunksByBook(bookId: string): Promise<void> {
    await prisma.chunk.deleteMany({ where: { bookId } });
  },
};
