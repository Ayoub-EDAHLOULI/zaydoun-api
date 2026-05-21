import fs from "fs/promises";
import path from "path";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
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
      // 3. Read the physical PDF
      const filePath = path.join(process.cwd(), "public", book.storagePath);
      const pdfBuffer = await fs.readFile(filePath);

      // 4. Custom render function to force a PAGE_BREAK delimiter
      const renderPage = async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(" ");
        return text + "\n---PAGE_BREAK---\n";
      };

      const pdfData = await pdfParse(pdfBuffer, { pagerender: renderPage });
      const rawPages = pdfData.text.split("\n---PAGE_BREAK---\n");
      if (rawPages[rawPages.length - 1].trim() === "") rawPages.pop(); // Remove trailing empty page

      // 5. Prepare text chunks
      const allTextChunks: {
        pageNumber: number;
        chunkIndex: number;
        content: string;
      }[] = [];

      for (let i = 0; i < rawPages.length; i++) {
        const pageNumber = i + 1;
        const pageText = rawPages[i].trim();
        if (!pageText) continue;

        const chunks = splitIntoChunks(pageText);
        chunks.forEach((content, chunkIndex) => {
          allTextChunks.push({ pageNumber, chunkIndex, content });
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
        data: { status: "READY", totalPages: rawPages.length },
      });
    } catch (error) {
      // If anything fails, mark as FAILED so the user can try again
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
