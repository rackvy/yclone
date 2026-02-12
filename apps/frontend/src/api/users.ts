import { apiClient } from './client';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'master' | 'manager';
  employee?: {
    id: string;
    fullName: string;
    role: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

export interface CreateUserDto {
  email: string;
  password: string;
  phone?: string;
}

export const usersApi = {
  // Получить список пользователей
  list: async (): Promise<User[]> => {
    return apiClient.get('/users');
  },

  // Создать пользователя
  create: async (data: CreateUserDto): Promise<User> => {
    return apiClient.post('/users', data);
  },

  // Получить профиль текущего пользователя
  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get('/auth/me');
  },

  // Обновить профиль
  updateProfile: async (data: { email?: string; password?: string }): Promise<UserProfile> => {
    return apiClient.patch('/auth/profile', data);
  },

  // Изменить пароль
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }> => {
    return apiClient.post('/users/change-password', data);
  },
};
