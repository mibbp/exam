export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type OpenType = 'PUBLIC' | 'USERS' | 'ROLES';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'FORCED_SUBMITTED';
export type RejoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PagedResult<T> {
  total: number;
  page: number;
  pageSize: number;
  rows: T[];
}

