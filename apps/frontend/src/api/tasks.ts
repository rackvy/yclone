import { apiClient } from './client';

export type TaskStatus = 'new' | 'in_progress' | 'done' | 'canceled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskRepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  companyId: string;
  branchId: string;
  title: string;
  description?: string;
  hasDateTime: boolean;
  date?: string;
  startTime?: string;
  durationMin: number;
  repeatType: TaskRepeatType;
  repeatUntil?: string;
  status: TaskStatus;
  priority: TaskPriority;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  branchId: string;
  title: string;
  description?: string;
  hasDateTime?: boolean;
  date?: string;
  startTime?: string;
  durationMin?: number;
  repeatType?: TaskRepeatType;
  repeatUntil?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  hasDateTime?: boolean;
  date?: string;
  startTime?: string;
  durationMin?: number;
  repeatType?: TaskRepeatType;
  repeatUntil?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export const tasksApi = {
  // Get all tasks for branch
  list: async (branchId?: string): Promise<Task[]> => {
    const query = branchId ? `?branchId=${branchId}` : '';
    return apiClient.get(`/tasks${query}`);
  },

  // Get tasks by date (for calendar)
  listByDate: async (branchId: string, date: string): Promise<Task[]> => {
    return apiClient.get(`/tasks/by-date?branchId=${branchId}&date=${date}`);
  },

  // Get simple tasks (without date - for popup)
  listSimple: async (branchId: string): Promise<Task[]> => {
    return apiClient.get(`/tasks/simple?branchId=${branchId}`);
  },

  // Get single task
  get: async (id: string): Promise<Task> => {
    return apiClient.get(`/tasks/${id}`);
  },

  // Create task
  create: async (data: CreateTaskDto): Promise<Task> => {
    return apiClient.post('/tasks', data);
  },

  // Update task
  update: async (id: string, data: UpdateTaskDto): Promise<Task> => {
    return apiClient.patch(`/tasks/${id}`, data);
  },

  // Complete task
  complete: async (id: string): Promise<Task> => {
    return apiClient.patch(`/tasks/${id}/complete`, {});
  },

  // Delete task
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/tasks/${id}`);
  },
};

export const getStatusLabel = (status: TaskStatus): string => {
  const labels: Record<TaskStatus, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    done: 'Выполнена',
    canceled: 'Отменена',
  };
  return labels[status];
};

export const getPriorityLabel = (priority: TaskPriority): string => {
  const labels: Record<TaskPriority, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
  };
  return labels[priority];
};

export const getPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };
  return colors[priority];
};

export const getRepeatLabel = (type: TaskRepeatType): string => {
  const labels: Record<TaskRepeatType, string> = {
    none: 'Не повторяется',
    daily: 'Каждый день',
    weekly: 'Каждую неделю',
    monthly: 'Каждый месяц',
    yearly: 'Каждый год',
  };
  return labels[type];
};
