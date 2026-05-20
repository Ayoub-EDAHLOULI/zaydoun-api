export interface ChunkData {
  id: string;
  bookId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  createdAt: Date;
}

export interface CreateChunkDto {
  bookId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding: number[];
}

export interface ChunkSearchResult {
  id: string;
  bookId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  similarity: number;
}
