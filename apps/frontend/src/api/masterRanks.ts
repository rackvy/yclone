import { apiClient } from './client';

export interface MasterRank {
  id: string;
  name: string;
  sort: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMasterRankDto {
  name: string;
  sort?: number;
  isActive?: boolean;
}

export interface UpdateMasterRankDto {
  name?: string;
  sort?: number;
  isActive?: boolean;
}

export const masterRanksApi = {
  list: async (): Promise<MasterRank[]> => {
    return apiClient.get<MasterRank[]>('/master-ranks');
  },

  create: async (data: CreateMasterRankDto): Promise<MasterRank> => {
    return apiClient.post<MasterRank>('/master-ranks', data);
  },

  update: async (id: string, data: UpdateMasterRankDto): Promise<MasterRank> => {
    return apiClient.patch<MasterRank>(`/master-ranks/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/master-ranks/${id}`);
  },
};
