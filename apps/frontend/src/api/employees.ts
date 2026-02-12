import { apiClient } from './client';

export type EmployeeRole = 'owner' | 'admin' | 'master' | 'manager';

export interface EmployeeService {
  serviceId: string;
  service: {
    id: string;
    name: string;
  };
}

export interface Employee {
  id: string;
  fullName: string;
  role: EmployeeRole;
  status: 'active' | 'terminated';
  phone?: string;
  email?: string;
  branchId?: string;
  userId?: string;
  masterRankId?: string;
  masterRank?: { id: string; name: string };
  services?: EmployeeService[];
}

export const employeesApi = {
  // Получить список сотрудников
  list: async (): Promise<Employee[]> => {
    return apiClient.get('/employees');
  },

  // Получить одного сотрудника
  get: async (id: string): Promise<Employee> => {
    return apiClient.get(`/employees/${id}`);
  },

  // Создать сотрудника
  create: async (data: Partial<Employee>): Promise<Employee> => {
    return apiClient.post('/employees', data);
  },

  // Обновить сотрудника
  update: async (id: string, data: Partial<Employee>): Promise<Employee> => {
    return apiClient.patch(`/employees/${id}`, data);
  },

  // Удалить сотрудника
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/employees/${id}`);
  },

  // Уволить сотрудника (soft delete)
  terminate: async (id: string): Promise<{ ok: boolean }> => {
    return apiClient.post(`/employees/${id}/terminate`);
  },

  // Восстановить сотрудника
  reactivate: async (id: string): Promise<{ ok: boolean }> => {
    return apiClient.post(`/employees/${id}/reactivate`);
  },

  // Получить услуги сотрудника
  getServices: async (id: string): Promise<{ id: string; name: string; durationMin: number; category?: { id: string; name: string } }[]> => {
    return apiClient.get(`/employees/${id}/services`);
  },

  // Добавить услугу сотруднику
  addService: async (id: string, serviceId: string): Promise<{ ok: boolean }> => {
    return apiClient.post(`/employees/${id}/services/${serviceId}`);
  },

  // Удалить услугу у сотрудника
  removeService: async (id: string, serviceId: string): Promise<{ ok: boolean }> => {
    return apiClient.delete(`/employees/${id}/services/${serviceId}`);
  },
};

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: 'Владелец',
    admin: 'Администратор',
    master: 'Мастер',
    manager: 'Менеджер',
  };
  return labels[role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    master: 'bg-green-100 text-green-800',
    manager: 'bg-orange-100 text-orange-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Активен',
    terminated: 'Уволен',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    terminated: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
