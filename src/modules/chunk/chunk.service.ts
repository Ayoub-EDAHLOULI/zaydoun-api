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
    // Run inserts in batches of 20 without a wrapping transaction —
    // avoids the 5 s interactive-transaction timeout on large books.
    // Prisma.raw is required for ::uuid casts — tagged-template params bind as
    // text by default and Postgres rejects "text = uuid" comparisons.
    const BATCH = 20;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      await Promise.all(
        slice.map((chunk) => {
          const vec = toVector(chunk.embedding);
          return prisma.$executeRaw`
            INSERT INTO chunks (id, book_id, page_number, chunk_index, content, token_count, embedding, created_at)
            VALUES (
              gen_random_uuid(),
              ${chunk.bookId}::text::uuid,
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
        }),
      );
    }
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

    // Verify ownership before the vector search
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    // Cast the uuid column to text for comparison — avoids the "text = uuid"
    // operator error that occurs when Prisma binds string params as text.
    if (pageNumber != null) {
      return prisma.$queryRaw<ChunkSearchResult[]>`
        SELECT c.id,
               c.book_id::text            AS "bookId",
               c.page_number              AS "pageNumber",
               c.chunk_index              AS "chunkIndex",
               c.content,
               1 - (c.embedding <=> ${vec}) AS similarity
        FROM   chunks c
        WHERE  c.book_id::text  = ${bookId}
          AND  c.page_number    = ${pageNumber}
          AND  c.embedding      IS NOT NULL
        ORDER BY c.embedding <=> ${vec}
        LIMIT  ${topK}
      `;
    }

    return prisma.$queryRaw<ChunkSearchResult[]>`
      SELECT c.id,
             c.book_id::text            AS "bookId",
             c.page_number              AS "pageNumber",
             c.chunk_index              AS "chunkIndex",
             c.content,
             1 - (c.embedding <=> ${vec}) AS similarity
      FROM   chunks c
      WHERE  c.book_id::text  = ${bookId}
        AND  c.embedding      IS NOT NULL
      ORDER BY c.embedding <=> ${vec}
      LIMIT  ${topK}
    `;
  },

  async deleteChunksByBook(bookId: string): Promise<void> {
    await prisma.chunk.deleteMany({ where: { bookId } });
  },
};
