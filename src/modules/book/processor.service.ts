import path from "path";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { prisma } from "../../lib/prisma";
import { chunkService } from "../chunk/chunk.service";
import { CreateChunkDto } from "../chunk/chunk.types";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to roughly split long pages into ~400 word chunks (~500 tokens)
function splitIntoChunks(text: string, maxWords = 400): string[] {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks.filter((c) => c.trim().length > 0);
}

export const processorService = {
  async processBook(bookId: string, userId: string): Promise<void> {
    // 1. Validate Book
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError("Book not found", StatusCodes.NOT_FOUND);
    if (book.userId !== userId)
      throw new AppError("Unauthorized", StatusCodes.FORBIDDEN);
    if (book.status === "READY")
      throw new AppError("Book is already processed", StatusCodes.BAD_REQUEST);

    // 2. Lock the book status to prevent double-processing
    await prisma.book.update({
      where: { id: bookId },
      data: { status: "PROCESSING" },
    });

    try {
      // 3. Clear any chunks from previous (failed/partial) runs
      await chunkService.deleteChunksByBook(bookId);

      // 4. Parse PDF with per-page text using pdf-parse v2
      const filePath = path.join(process.cwd(), "public", book.storagePath);
      const parser = new PDFParse({ url: filePath });
      const pdfData = await parser.getText({ pageJoiner: "" });
      await parser.destroy();

      // 5. Prepare text chunks from per-page results
      const allTextChunks: {
        pageNumber: number;
        chunkIndex: number;
        content: string;
      }[] = [];

      for (const page of pdfData.pages) {
        const pageText = page.text.trim();
        if (!pageText) continue;

        const chunks = splitIntoChunks(pageText);
        chunks.forEach((content, chunkIndex) => {
          allTextChunks.push({ pageNumber: page.num, chunkIndex, content });
        });
      }

      // 6. Embed in Batches of 100 (Lightning fast & API safe)
      const dbChunks: CreateChunkDto[] = [];
      const BATCH_SIZE = 100;

      for (let i = 0; i < allTextChunks.length; i += BATCH_SIZE) {
        const batch = allTextChunks.slice(i, i + BATCH_SIZE);
        const inputs = batch.map((b) => b.content);

        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: inputs,
        });

        batch.forEach((item, index) => {
          dbChunks.push({
            bookId,
            pageNumber: item.pageNumber,
            chunkIndex: item.chunkIndex,
            content: item.content,
            tokenCount: Math.round(
              embeddingResponse.usage.prompt_tokens / batch.length,
            ),
            embedding: embeddingResponse.data[index].embedding,
          });
        });
      }

      // 7. Save to pgvector & update Book status
      await chunkService.createChunks(dbChunks);
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "READY", totalPages: pdfData.total },
      });
    } catch (error) {
      console.error("[processor] processBook failed:", error);
      await prisma.book.update({
        where: { id: bookId },
        data: { status: "FAILED" },
      });
      throw new AppError(
        "Failed to process book vectors",
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  },
};
