import { apiClient } from './client';

export interface WorkScheduleRule {
  id: string;
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface WorkScheduleException {
  id: string;
  date: string;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface ScheduleDayInput {
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

export const scheduleApi = {
  // Получить правила расписания сотрудника
  getRules: async (employeeId: string): Promise<{ employeeId: string; days: WorkScheduleRule[] }> => {
    return apiClient.get(`/schedule/rules?employeeId=${employeeId}`);
  },

  // Сохранить правила расписания
  saveRules: async (employeeId: string, days: ScheduleDayInput[]): Promise<{ employeeId: string; days: WorkScheduleRule[] }> => {
    return apiClient.post('/schedule/rules', { employeeId, days });
  },

  // Получить исключения (выходные/переработки) за период
  getExceptions: async (employeeId: string, from: string, to: string): Promise<{ employeeId: string; from: string; to: string; items: WorkScheduleException[] }> => {
    return apiClient.get(`/schedule/exceptions?employeeId=${employeeId}&from=${from}&to=${to}`);
  },

  // Создать/обновить исключение
  saveException: async (data: {
    employeeId: string;
    date: string;
    isWorkingDay: boolean;
    startTime?: string;
    endTime?: string;
  }): Promise<WorkScheduleException> => {
    return apiClient.post('/schedule/exceptions', data);
  },

  // Удалить исключение
  deleteException: async (employeeId: string, date: string): Promise<void> => {
    await apiClient.delete(`/schedule/exceptions?employeeId=${employeeId}&date=${date}`);
  },

  // Получить блокировки (перерывы) за период
  getBlocks: async (employeeId: string, from: string, to: string): Promise<{ employeeId: string; from: string; to: string; blocks: WorkScheduleBlock[] }> => {
    return apiClient.get(`/schedule/blocks?employeeId=${employeeId}&from=${from}&to=${to}`);
  },

  // Создать блокировку (перерыв)
  createBlock: async (data: {
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }): Promise<WorkScheduleBlock> => {
    return apiClient.post('/schedule/blocks', data);
  },

  // Удалить блокировку
  deleteBlock: async (blockId: string): Promise<void> => {
    await apiClient.delete(`/schedule/blocks/${blockId}`);
  },
};

export interface WorkScheduleBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

// Helper functions
export const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const dayNamesFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export const formatTime = (time: string | null) => {
  if (!time) return '-';
  return time.substring(0, 5); // HH:MM
};
