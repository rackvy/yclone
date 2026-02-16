import { apiClient } from './client';

export interface Note {
  id: string;
  companyId: string;
  branchId: string;
  clientId?: string;
  client?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  employeeId?: string;
  employee?: {
    id: string;
    fullName: string;
  };
  serviceId?: string;
  service?: {
    id: string;
    name: string;
    durationMin: number;
  };
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  branchId: string;
  clientId?: string;
  serviceId?: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string; // HH:MM
  color?: string;
}

export interface UpdateNoteDto {
  clientId?: string;
  serviceId?: string;
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
}

export const notesApi = {
  listByDate: async (branchId: string, date: string): Promise<Note[]> => {
    return apiClient.get(`/notes/by-date?branchId=${branchId}&date=${date}`);
  },

  get: async (id: string): Promise<Note> => {
    return apiClient.get(`/notes/${id}`);
  },

  create: async (dto: CreateNoteDto): Promise<Note> => {
    return apiClient.post('/notes', dto);
  },

  update: async (id: string, dto: UpdateNoteDto): Promise<Note> => {
    return apiClient.patch(`/notes/${id}`, dto);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/notes/${id}`);
  },
};

export const NOTE_COLORS = {
  purple: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
  green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-900' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900' },
};

export const getNoteColor = (color: string) => {
  return NOTE_COLORS[color as keyof typeof NOTE_COLORS] || NOTE_COLORS.purple;
};
