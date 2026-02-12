import { apiClient } from './client';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchDto {
  name: string;
  address?: string;
}

export interface UpdateBranchDto {
  name?: string;
  address?: string;
}

export const branchesApi = {
  list: async (): Promise<Branch[]> => {
    return apiClient.get<Branch[]>('/branches');
  },

  create: async (data: CreateBranchDto): Promise<Branch> => {
    return apiClient.post<Branch>('/branches', data);
  },

  update: async (id: string, data: UpdateBranchDto): Promise<Branch> => {
    return apiClient.patch<Branch>(`/branches/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/branches/${id}`);
  },
};
