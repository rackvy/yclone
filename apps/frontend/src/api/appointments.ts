import { apiClient } from './client';

export type AppointmentStatus = 'new' | 'confirmed' | 'waiting' | 'done' | 'no_show' | 'canceled';
export type AppointmentType = 'online' | 'offline';

export interface AppointmentService {
  id: string;
  durationMin: number;
  price: number;
  service: {
    id: string;
    name: string;
  };
}

export interface AppointmentProduct {
  id: string;
  qty: number;
  price: number;
  total: number;
  product: {
    id: string;
    name: string;
  };
}

export interface AppointmentClient {
  id: string;
  fullName: string;
  phone?: string;
}

export interface AppointmentEmployee {
  id: string;
  fullName: string;
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  paymentStatus?: "unpaid" | "partial" | "paid" | "refunded";
  paidTotalKopeks?: number;
  title?: string;
  comment?: string;
  startAt: string;
  endAt: string;
  isPaid: boolean;
  total: number;
  masterEmployeeId: string;
  masterEmployee: AppointmentEmployee;
  clientId: string;
  client: AppointmentClient;
  services: AppointmentService[];
  products: AppointmentProduct[];
}

export interface CreateAppointmentDto {
  branchId: string;
  masterEmployeeId: string;
  type: 'service' | 'block';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  clientId?: string;
  title?: string;
  comment?: string;
  isPaid?: boolean;
  services?: { serviceId: string; sortOrder?: number }[];
  blockDurationMin?: number;
}

export interface RescheduleAppointmentDto {
  masterEmployeeId?: string;
  date?: string;
  startTime?: string;
}

export const appointmentsApi = {
  // Получить записи за день
  listDay: async (branchId: string, date: string): Promise<Appointment[]> => {
    return apiClient.get(`/appointments/day?branchId=${branchId}&date=${date}`);
  },

  // Создать запись
  create: async (data: CreateAppointmentDto): Promise<Appointment> => {
    return apiClient.post('/appointments', data);
  },

  // Отменить запись
  cancel: async (id: string): Promise<{ ok: boolean }> => {
    return apiClient.patch(`/appointments/${id}/cancel`, {});
  },

  // Обновить статус
  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    return apiClient.patch(`/appointments/${id}/status`, { status });
  },

  // Перенести запись
  reschedule: async (id: string, data: RescheduleAppointmentDto): Promise<Appointment> => {
    return apiClient.patch(`/appointments/${id}/reschedule`, data);
  },

  // Получить записи клиента
  listByClient: async (clientId: string): Promise<Appointment[]> => {
    return apiClient.get(`/appointments/client/${clientId}`);
  },

  // Добавить товары к записи
  addProducts: async (id: string, products: { productId: string; qty: number }[]): Promise<Appointment> => {
    return apiClient.post(`/appointments/${id}/products`, { items: products });
  },

  // Обновить запись (редактирование)
  update: async (id: string, data: Partial<CreateAppointmentDto>): Promise<Appointment> => {
    return apiClient.patch(`/appointments/${id}`, data);
  },
};

export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    new: 'Новая',
    confirmed: 'Подтверждено',
    waiting: 'Ожидание',
    done: 'Выполнено',
    no_show: 'Не пришел',
    canceled: 'Отменено',
  };
  return labels[status] || status;
}

export function getStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    new: 'border-gray-500 bg-gray-50',
    confirmed: 'border-blue-500 bg-blue-50',
    waiting: 'border-amber-500 bg-amber-50',
    done: 'border-green-500 bg-green-50',
    no_show: 'border-red-500 bg-red-50',
    canceled: 'border-red-500 bg-red-50',
  };
  return colors[status] || 'border-gray-500 bg-gray-50';
}

export function getStatusBadgeColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    new: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    waiting: 'bg-amber-100 text-amber-700',
    done: 'bg-green-100 text-green-700',
    no_show: 'bg-red-100 text-red-700',
    canceled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}
