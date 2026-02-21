import { apiClient } from './client';

export interface CashShift {
  id: string;
  companyId: string;
  branchId: string;
  branch?: { id: string; name: string };
  date: string;
  status: 'open' | 'closed';
  openedAt: string;
  openedByEmployeeId?: string;
  openedByEmployee?: { id: string; fullName: string };
  closedAt?: string;
  closedByEmployeeId?: string;
  closedByEmployee?: { id: string; fullName: string };
  expectedCash: number;
  actualCash?: number;
  diffCash?: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenShiftRequest {
  date: string; // YYYY-MM-DD
  branchId: string;
  comment?: string;
}

export interface CloseShiftRequest {
  actualCash: number;
  comment?: string;
}

export interface ListShiftsParams {
  date?: string;
  branchId?: string;
}

export const cashShiftsApi = {
  // Открыть смену
  open: (data: OpenShiftRequest): Promise<CashShift> => {
    return apiClient.post('/api/shifts/open', data);
  },

  // Закрыть смену
  close: (shiftId: string, data: CloseShiftRequest): Promise<CashShift> => {
    return apiClient.post(`/api/shifts/${shiftId}/close`, data);
  },

  // Получить список смен
  list: (params?: ListShiftsParams): Promise<CashShift[]> => {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.branchId) query.append('branchId', params.branchId);
    const queryString = query.toString();
    return apiClient.get(`/api/shifts${queryString ? `?${queryString}` : ''}`);
  },

  // Получить одну смену
  get: (shiftId: string): Promise<CashShift> => {
    return apiClient.get(`/api/shifts/${shiftId}`);
  },
};

// Хелпер: форматировать дату для API (локальная дата без смещения часового пояса)
export const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Хелпер: получить сегодняшнюю дату
export const getToday = (): string => {
  return formatDateForApi(new Date());
};
