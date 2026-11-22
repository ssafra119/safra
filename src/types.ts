export interface Product {
  id: string;
  title: string;
  category: string;
  images: string[];
  piecesPerCarton: number;
  piecePrice: number;    // Price per piece in IQD (e.g. 1500)
  cartonPrice: number;   // Price per carton in IQD (e.g. 18000)
  stockCartons: number;  // Available cartons in warehouse
  stockPieces: number;   // Additional individual pieces in warehouse
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface SafraBackup {
  version: string;
  company: string;
  exportedAt: string;
  categories: Category[];
  products: Product[];
}

export type UserRole = 'rep' | 'admin' | 'superadmin';

export interface UserAccount {
  uid: string;
  name: string;
  phone: string;
  notes: string;
  role: UserRole;
  active: boolean;
  expiresAtMs: number;
  deviceId: string | null;
  createdAtMs: number;
  lastLoginAtMs: number | null;
}

