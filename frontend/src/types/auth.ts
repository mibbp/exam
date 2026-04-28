export type UserRole = 'ADMIN' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface AuthUser {
  id: number;
  username: string;
  displayName?: string;
  role: UserRole;
  status?: UserStatus;
  roles: string[];
  roleIds?: number[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

