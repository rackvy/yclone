import { apiClient } from './client';

export type SalaryCalcMode = 'percent' | 'fixed';
export type SalaryMinMode = 'none' | 'daily' | 'monthly';

export interface SalaryRule {
  id: string;
  name: string;
  isActive: boolean;
  startsAt: string;
  calcByPayments: boolean;
  includeRefunds: boolean;
  servicesMode: SalaryCalcMode;
  servicesValue: number;
  productsMode: SalaryCalcMode;
  productsValue: number;
  minMode: SalaryMinMode;
  minValue: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assignments: number;
  };
}

export interface ServiceOverride {
  id: string;
  serviceId?: string;
  service?: { id: string; name: string };
  categoryId?: string;
  category?: { id: string; name: string };
  mode: SalaryCalcMode;
  value: number;
}

export interface ProductOverride {
  id: string;
  productId?: string;
  product?: { id: string; name: string };
  categoryId?: string;
  category?: { id: string; name: string };
  mode: SalaryCalcMode;
  value: number;
}

export interface SalaryRuleDetail extends SalaryRule {
  serviceOverrides: ServiceOverride[];
  productOverrides: ProductOverride[];
  assignments: {
    id: string;
    employee: { id: string; fullName: string };
    branch: { id: string; name: string } | null;
    startsAt: string;
  }[];
}

export interface SalaryRuleAssignment {
  id: string;
  ruleId: string;
  rule: { id: string; name: string };
  employeeId: string;
  employee: { id: string; fullName: string };
  branchId: string | null;
  branch: { id: string; name: string } | null;
  startsAt: string;
  createdAt: string;
}

export interface CreateSalaryRuleDto {
  name: string;
  isActive?: boolean;
  startsAt?: string;
  calcByPayments?: boolean;
  includeRefunds?: boolean;
  servicesMode: SalaryCalcMode;
  servicesValue: number;
  productsMode: SalaryCalcMode;
  productsValue: number;
  minMode: SalaryMinMode;
  minValue: number;
}

export interface UpdateSalaryRuleDto extends Partial<CreateSalaryRuleDto> {
  serviceOverrides?: Omit<ServiceOverride, 'service' | 'category'>[];
  productOverrides?: Omit<ProductOverride, 'product' | 'category'>[];
}

export interface CreateAssignmentDto {
  ruleId: string;
  employeeId: string;
  branchId?: string;
  startsAt?: string;
}

export const payrollApi = {
  // Salary Rules
  listRules: (): Promise<SalaryRule[]> => {
    return apiClient.get('/api/payroll/rules');
  },

  getRule: (id: string): Promise<SalaryRuleDetail> => {
    return apiClient.get(`/api/payroll/rules/${id}`);
  },

  createRule: (data: CreateSalaryRuleDto): Promise<SalaryRule> => {
    return apiClient.post('/api/payroll/rules', data);
  },

  updateRule: (id: string, data: UpdateSalaryRuleDto): Promise<SalaryRule> => {
    return apiClient.patch(`/api/payroll/rules/${id}`, data);
  },

  deleteRule: (id: string): Promise<SalaryRule> => {
    return apiClient.delete(`/api/payroll/rules/${id}`);
  },

  // Assignments
  listAssignments: (params?: { employeeId?: string; ruleId?: string }): Promise<SalaryRuleAssignment[]> => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.ruleId) query.append('ruleId', params.ruleId);
    return apiClient.get(`/api/payroll/assignments?${query.toString()}`);
  },

  createAssignment: (data: CreateAssignmentDto): Promise<SalaryRuleAssignment> => {
    return apiClient.post('/api/payroll/assignments', data);
  },

  deleteAssignment: (id: string): Promise<void> => {
    return apiClient.delete(`/api/payroll/assignments/${id}`);
  },

  // Payroll Calculation
  calculate: (data: {
    from: string;
    to: string;
    branchId?: string;
    employeeId?: string;
  }): Promise<{
    summaryRows: {
      employeeId: string;
      fullName: string;
      servicesKopeks: number;
      productsKopeks: number;
      bonusKopeks: number;
      minimumTopUpKopeks: number;
      totalKopeks: number;
    }[];
    detailsByEmployee: Record<string, {
      services: {
        appointmentId: string;
        date: string;
        serviceName: string;
        baseKopeks: number;
        ruleApplied: string;
        earnedKopeks: number;
      }[];
      products: {
        saleIdOrAppointmentId: string;
        date: string;
        productName: string;
        qty: number;
        revenueKopeks: number;
        ruleApplied: string;
        earnedKopeks: number;
      }[];
      refunds: any[];
    }>;
  }> => {
    return apiClient.post('/api/payroll/calc', data);
  },

  // ==================== PAYROLL RUNS ====================

  createRun: (data: { fromDate: string; toDate: string; branchId?: string }) => {
    return apiClient.post('/api/payroll/runs', data);
  },

  listRuns: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const qs = query.toString();
    return apiClient.get(`/api/payroll/runs${qs ? '?' + qs : ''}`);
  },

  getRun: (id: string) => {
    return apiClient.get(`/api/payroll/runs/${id}`);
  },

  approveRun: (id: string) => {
    return apiClient.post(`/api/payroll/runs/${id}/approve`);
  },
};
