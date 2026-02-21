import { apiClient } from './client';
import { Appointment } from './appointments';

export interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  monthRevenue: number;
  revenueGrowth: number;
  totalClients: number;
  newClientsThisMonth: number;
  activeEmployees: number;
}

export interface RevenueChartItem {
  label: string;
  revenue: number;
  appointments: number;
}

export interface ServiceChartItem {
  name: string;
  count: number;
  revenue: number;
}

export const dashboardApi = {
  getStats: async (branchId?: string): Promise<DashboardStats> => {
    const url = branchId ? `/dashboard/stats?branchId=${branchId}` : '/dashboard/stats';
    return apiClient.get<DashboardStats>(url);
  },

  getRevenueChart: async (period: 'week' | 'month' | 'year' = 'month', branchId?: string): Promise<RevenueChartItem[]> => {
    let url = `/dashboard/revenue-chart?period=${period}`;
    if (branchId) url += `&branchId=${branchId}`;
    return apiClient.get<RevenueChartItem[]>(url);
  },

  getServicesChart: async (from: string, to: string, branchId?: string): Promise<ServiceChartItem[]> => {
    let url = `/dashboard/services-chart?from=${from}&to=${to}`;
    if (branchId) url += `&branchId=${branchId}`;
    return apiClient.get<ServiceChartItem[]>(url);
  },

  getRecentAppointments: async (limit: number = 5, branchId?: string): Promise<Appointment[]> => {
    let url = `/dashboard/recent-appointments?limit=${limit}`;
    if (branchId) url += `&branchId=${branchId}`;
    return apiClient.get<Appointment[]>(url);
  },
};
