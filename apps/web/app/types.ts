// Shapes returned by the Iwear API.

export type Role = 'ADMIN' | 'COMPANY' | 'CUSTOMER' | 'COURIER';
export type CompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type Category = 'DRESS' | 'TOP' | 'BOTTOM' | 'OUTERWEAR' | 'SUIT' | 'ACCESSORY';

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
  logoUrl: string | null;
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

export interface ProductSize {
  id?: string;
  label: string;
  stock: number;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
}

export interface ProductImage {
  id: string;
  url: string;
}

/** A product as its company sees it. */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  price: number;
  colors: string[];
  isPublished: boolean;
  createdAt: string;
  sizes: ProductSize[];
  images: ProductImage[];
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  logoUrl: string | null;
  productCount: number;
  previewImages: string[];
}

export interface ProductCard {
  id: string;
  name: string;
  category: Category;
  price: number;
  colors: string[];
  images: { url: string }[];
  sizes: { label: string; stock: number }[];
}

export interface Store extends Omit<StoreSummary, 'productCount' | 'previewImages'> {
  categories: Category[];
  products: ProductCard[];
}

export interface PublicProduct extends Omit<ProductCard, 'images' | 'sizes'> {
  description: string | null;
  images: ProductImage[];
  sizes: ProductSize[];
  company: { name: string; slug: string; logoUrl: string | null };
}
