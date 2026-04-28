export type RepositoryStatus = 'ACTIVE' | 'ARCHIVED';
export type QuestionStatus = 'ACTIVE' | 'DISABLED';
export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE';

export interface QuestionRepository {
  id: number;
  name: string;
  description?: string | null;
  status: RepositoryStatus;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { questions: number };
}

export interface Question {
  id: number;
  repositoryId?: number | null;
  repository?: QuestionRepository | null;
  type: QuestionType;
  content: string;
  options: string[];
  answer: string;
  score: number;
  analysis?: string | null;
  difficulty: number;
  tags?: string[];
  knowledgePoints?: string[];
  source?: string | null;
  status: QuestionStatus;
}

