// Shapes returned by the Iwear API.

export type Role = 'ADMIN' | 'COMPANY' | 'CUSTOMER' | 'COURIER';
export type CompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  rejectionReason: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  company: CompanySummary | null;
}

export interface Company extends CompanySummary {
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  createdAt: string;
  reviewedAt: string | null;
  owner: { id: string; email: string; name: string; phone: string | null };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
