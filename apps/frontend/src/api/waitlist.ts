import { apiClient } from './client';

export interface WaitlistItem {
  id: string;
  branchId: string;
  clientId: string;
  serviceId?: string;
  masterEmployeeId?: string;
  preferredDate?: string;
  preferredTimeFrom?: string;
  preferredTimeTo?: string;
  comment?: string;
  status: 'pending' | 'contacted' | 'booked' | 'canceled';
  createdAt: string;
  client: { id: string; fullName: string; phone: string };
  service?: { id: string; name: string };
  masterEmployee?: { id: string; fullName: string };
  branch: { id: string; name: string };
}

export interface CreateWaitlistData {
  branchId: string;
  clientId: string;
  serviceId?: string;
  masterEmployeeId?: string;
  preferredDate?: string;
  preferredTimeFrom?: string;
  preferredTimeTo?: string;
  comment?: string;
}

export interface UpdateWaitlistData {
  status?: 'pending' | 'contacted' | 'booked' | 'canceled';
  comment?: string;
}

export const waitlistApi = {
  list: async (branchId?: string, status?: string): Promise<WaitlistItem[]> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (status) params.append('status', status);
    const query = params.toString();
    return apiClient.get(`/waitlist${query ? '?' + query : ''}`);
  },

  create: async (data: CreateWaitlistData): Promise<WaitlistItem> => {
    return apiClient.post('/waitlist', data);
  },

  update: async (id: string, data: UpdateWaitlistData): Promise<WaitlistItem> => {
    return apiClient.patch(`/waitlist/${id}`, data);
  },

  remove: async (id: string): Promise<{ ok: boolean }> => {
    return apiClient.delete(`/waitlist/${id}`);
  },
};
