import { apiClient } from './client';

export interface ClientCertificate {
  id: string;
  name: string;
  amount: number;
  remaining: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface ClientStats {
  visitsCount: number;
  totalSpent: number;
  avgCheck: number;
  visitsPerMonth: number;
  firstVisit: string | null;
  lastVisit: string | null;
  preferredMaster: { id: string; name: string; count: number } | null;
  topServices: { id: string; name: string; count: number }[];
}

export interface Client {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  comment?: string;
  notes?: string;
  discountPercent: number;
  discountAppliesTo: 'all' | 'services' | 'products';
  preferredMasterId?: string;
  preferredMaster?: { id: string; fullName: string };
  preferredServiceIds?: string; // JSON string
  preferredProductIds?: string; // JSON string
  certificates?: ClientCertificate[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  fullName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  comment?: string;
  notes?: string;
  discountPercent?: number;
  discountAppliesTo?: 'all' | 'services' | 'products';
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

  // ===== CERTIFICATES =====
  addCertificate: async (clientId: string, data: { name: string; amount: number; expiresAt?: string }): Promise<ClientCertificate> => {
    return apiClient.post(`/clients/${clientId}/certificates`, data);
  },

  listCertificates: async (clientId: string): Promise<ClientCertificate[]> => {
    return apiClient.get(`/clients/${clientId}/certificates`);
  },

  updateCertificate: async (certId: string, data: { remaining?: number; isActive?: boolean }): Promise<ClientCertificate> => {
    return apiClient.patch(`/clients/certificates/${certId}`, data);
  },

  // ===== STATISTICS =====
  getStats: async (clientId: string): Promise<ClientStats> => {
    return apiClient.get(`/clients/${clientId}/stats`);
  },
};
