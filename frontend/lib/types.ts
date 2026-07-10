export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  matric_number: string | null;
  is_verified: boolean;
}

export type SubmissionStatus =
  | 'draft'
  | 'pending_review'
  | 'revision_requested'
  | 'rejected'
  | 'published'
  | 'unpublished';

export interface Submission {
  id: string;
  title: string;
  abstract: string;
  author_name: string;
  matric_number: string | null;
  department: string | null;
  session: string | null;
  tags: string[];
  status: SubmissionStatus;
  review_comment: string | null;
  has_pdf: boolean;
  index_status: string;
  author_email?: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  author_name: string;
  department: string | null;
  session: string | null;
  tags: string[];
  published_at: string;
}

export interface SearchResult extends Paper {
  score: number;
  excerpt?: string;
  matchType?: 'keyword' | 'semantic' | 'hybrid';
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Stats {
  totalStudents: number;
  totalSubmissions: number;
  published: number;
  byStatus: Record<SubmissionStatus, number>;
}
