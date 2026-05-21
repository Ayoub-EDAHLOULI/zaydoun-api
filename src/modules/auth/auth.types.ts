export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileDto {
  name?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
