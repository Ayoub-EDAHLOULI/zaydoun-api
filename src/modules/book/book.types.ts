import { BookStatus } from "@prisma/client";

export { BookStatus };

export interface BookSummary {
  id: string;
  title: string;
  author: string | null;
  language: string;
  totalPages: number;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookDetail extends BookSummary {
  storagePath: string;
  stats: {
    totalChunks: number;
    totalConversations: number;
  };
}

export interface CreateBookDto {
  title: string;
  author?: string;
  language?: string;
}
