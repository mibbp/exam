export interface Permission {
  id: number;
  code: string;
  name: string;
  category: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions?: Array<{ permission: Permission }>;
  _count?: { userAssignments: number };
}

export interface UserRow {
  id: number;
  username: string;
  displayName?: string | null;
  role: 'ADMIN' | 'STUDENT';
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt?: string | null;
  createdAt?: string | null;
  roles: Array<{ id: number; code: string; name: string }>;
}

