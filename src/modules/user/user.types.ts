export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
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
