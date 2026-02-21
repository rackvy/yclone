import { apiClient } from './client';

export interface SummaryReport {
  period: {
    from: string;
    to: string;
    branchId: string | null;
  };
  revenue: {
    servicesKopeks: number;
    productsKopeks: number;
    totalKopeks: number;
  };
  byMethod: Array<{
    methodId: string;
    name: string;
    amount: number;
  }>;
  byCashbox: Array<{
    cashboxId: string;
    name: string;
    amount: number;
  }>;
}

export interface MastersReport {
  period: {
    from: string;
    to: string;
    branchId: string | null;
  };
  masters: Array<{
    masterId: string;
    fullName: string;
    appointmentsDone: number;
    revenueKopeks: number;
    avgCheckKopeks: number;
  }>;
  summary: {
    totalAppointments: number;
    totalRevenueKopeks: number;
  };
}

export interface ProductsReport {
  period: {
    from: string;
    to: string;
    branchId: string | null;
  };
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    qtySold: number;
    revenueKopeks: number;
  }>;
  summary: {
    totalItemsSold: number;
    totalRevenueKopeks: number;
  };
}

export interface ReportFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  branchId?: string;
}

export const reportsApi = {
  // Сводный отчёт по выручке
  getSummary: (filters?: ReportFilters): Promise<SummaryReport> => {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    const query = params.toString();
    return apiClient.get(`/api/reports/summary${query ? `?${query}` : ''}`);
  },

  // Отчёт по мастерам
  getMasters: (filters?: ReportFilters): Promise<MastersReport> => {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    const query = params.toString();
    return apiClient.get(`/api/reports/masters${query ? `?${query}` : ''}`);
  },

  // Отчёт по товарам
  getProducts: (filters?: ReportFilters): Promise<ProductsReport> => {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    const query = params.toString();
    return apiClient.get(`/api/reports/products${query ? `?${query}` : ''}`);
  },
};
