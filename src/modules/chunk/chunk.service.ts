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

    // Execute all queries in a single database transaction
    await prisma.$transaction(queries);
  },

  async getChunksByBook(bookId: string, userId: string): Promise<ChunkData[]> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
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
    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
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

  // Strict page-level RAG: hard metadata pre-filter (book + page) THEN cosine similarity
  async searchChunks(
    bookId: string,
    queryEmbedding: number[],
    userId: string,
    pageNumber?: number,
    topK: number = 5,
  ): Promise<ChunkSearchResult[]> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
      throw new AppError("Book not found", StatusCodes.NOT_FOUND);

    const vec = toVector(queryEmbedding);

    if (pageNumber != null) {
      return prisma.$queryRaw<ChunkSearchResult[]>`
        SELECT id,
               book_id      AS "bookId",
               page_number  AS "pageNumber",
               chunk_index  AS "chunkIndex",
               content,
               1 - (embedding <=> ${vec}) AS similarity
        FROM   chunks
        WHERE  book_id    = ${bookId}::uuid
          AND  page_number = ${pageNumber}
          AND  embedding  IS NOT NULL
        ORDER BY embedding <=> ${vec}
        LIMIT  ${topK}
      `;
    }

    return prisma.$queryRaw<ChunkSearchResult[]>`
      SELECT id,
             book_id     AS "bookId",
             page_number AS "pageNumber",
             chunk_index AS "chunkIndex",
             content,
             1 - (embedding <=> ${vec}) AS similarity
      FROM   chunks
      WHERE  book_id   = ${bookId}::uuid
        AND  embedding IS NOT NULL
      ORDER BY embedding <=> ${vec}
      LIMIT  ${topK}
    `;
  },

  async deleteChunksByBook(bookId: string): Promise<void> {
    await prisma.chunk.deleteMany({ where: { bookId } });
  },
};
