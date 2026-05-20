import { MessageRole } from "@prisma/client";

export { MessageRole };

export interface MessageData {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sourcePage: number | null;
  audioPath: string | null;
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  bookId: string;
  title: string | null;
  languageCode: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: MessageData | null;
}

export interface ConversationDetail {
  id: string;
  bookId: string;
  title: string | null;
  languageCode: string;
  createdAt: Date;
  updatedAt: Date;
  messages: MessageData[];
}

export interface CreateConversationDto {
  bookId: string;
  languageCode?: string;
}

export interface AddMessageDto {
  role: MessageRole;
  content: string;
  sourcePage?: number;
  audioPath?: string;
}
