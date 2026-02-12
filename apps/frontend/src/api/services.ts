import { apiClient } from './client';

export interface ServicePriceByRank {
  id: string;
  masterRankId: string;
  price: number;
  masterRank?: { id: string; name: string };
}

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  categoryId: string | null;
  sort: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pricesByRank: ServicePriceByRank[];
  category?: { id: string; name: string } | null;
}

export interface ServicePriceDto {
  masterRankId: string;
  price: number;
}

export interface CreateServiceDto {
  name: string;
  durationMin: number;
  categoryId?: string;
  sort?: number;
  isActive?: boolean;
  pricesByRank?: ServicePriceDto[];
}

export interface UpdateServiceDto {
  name?: string;
  durationMin?: number;
  categoryId?: string;
  sort?: number;
  isActive?: boolean;
  pricesByRank?: ServicePriceDto[];
}

export const servicesApi = {
  list: async (categoryId?: string): Promise<Service[]> => {
    const url = categoryId ? `/services?categoryId=${categoryId}` : '/services';
    return apiClient.get<Service[]>(url);
  },

  create: async (data: CreateServiceDto): Promise<Service> => {
    return apiClient.post<Service>('/services', data);
  },

  update: async (id: string, data: UpdateServiceDto): Promise<Service> => {
    return apiClient.patch<Service>(`/services/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/services/${id}`);
  },
};

// Service Categories API
export interface ServiceCategory {
  id: string;
  name: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceCategoryDto {
  name: string;
  sort?: number;
}

export interface UpdateServiceCategoryDto {
  name?: string;
  sort?: number;
}

export const serviceCategoriesApi = {
  list: async (): Promise<ServiceCategory[]> => {
    return apiClient.get<ServiceCategory[]>('/service-categories');
  },

  create: async (data: CreateServiceCategoryDto): Promise<ServiceCategory> => {
    return apiClient.post<ServiceCategory>('/service-categories', data);
  },

  update: async (id: string, data: UpdateServiceCategoryDto): Promise<ServiceCategory> => {
    return apiClient.patch<ServiceCategory>(`/service-categories/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/service-categories/${id}`);
  },
};
