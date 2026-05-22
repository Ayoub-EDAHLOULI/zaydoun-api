export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
  stats: UserStats;
}

export interface CreateAdminUserDto {
  name?: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
}

export interface UserStats {
  totalBooks: number;
  totalConversations: number;
}

export interface UserWithStats extends UserProfile {
  stats: UserStats;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
  cost: number; // USD
  messages: number;
}

export interface ConversationUsage {
  id: string;
  title: string | null;
  bookTitle: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
  cost: number;
  updatedAt: Date;
}

export interface UsageStats {
  period: "day" | "week" | "month" | "all";
  totalInputTokens: number;
  totalOutputTokens: number;
  totalAudioSeconds: number;
  totalCost: number;
  totalMessages: number;
  totalConversations: number;
  dailyBreakdown: DailyUsage[];
  topConversations: ConversationUsage[];
  // Compared to previous period
  costDelta: number | null; // % change vs previous period
  messagesDelta: number | null;
}
