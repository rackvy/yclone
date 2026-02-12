export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  companyId: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  branchId: string;
  role: 'admin' | 'manager' | 'master';
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarKey: string | null;
  masterRankId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  companyId: string;
  categoryId: string | null;
  name: string;
  durationMin: number;
  isActive: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  branchId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stockQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  companyId: string;
  branchId: string;
  type: 'service' | 'block';
  status: 'new' | 'confirmed' | 'waiting' | 'done' | 'no_show' | 'canceled';
  masterEmployeeId: string;
  clientId: string | null;
  title: string | null;
  comment: string | null;
  startAt: string;
  endAt: string;
  isPaid: boolean;
  totalServices: number;
  totalProducts: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  companyName: string;
}
