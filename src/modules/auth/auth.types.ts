export interface LoginDto {
  email: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  accessToken: string;
}

export interface UpdateProfileDto {
  name?: string;
}
