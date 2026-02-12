import { apiClient } from './client';

export interface Client {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  fullName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  comment?: string;
}

export const clientsApi = {
  // Получить список клиентов
  list: async (): Promise<Client[]> => {
    return apiClient.get('/clients');
  },

  // Поиск клиентов
  search: async (query: string): Promise<Client[]> => {
    return apiClient.get(`/clients/search?q=${encodeURIComponent(query)}`);
  },

  // Получить одного клиента
  get: async (id: string): Promise<Client> => {
    return apiClient.get(`/clients/${id}`);
  },

  // Создать клиента
  create: async (data: CreateClientDto): Promise<Client> => {
    return apiClient.post('/clients', data);
  },

  // Обновить клиента
  update: async (id: string, data: Partial<CreateClientDto>): Promise<Client> => {
    return apiClient.patch(`/clients/${id}`, data);
  },

  // Удалить клиента
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },
};
