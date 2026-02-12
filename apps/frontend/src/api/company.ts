import { apiClient } from './client';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyDto {
  name?: string;
}

export const companyApi = {
  getMe: async (): Promise<Company> => {
    return apiClient.get<Company>('/company/me');
  },

  updateMe: async (data: UpdateCompanyDto): Promise<Company> => {
    return apiClient.patch<Company>('/company/me', data);
  },
};
