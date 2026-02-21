import { UserRole } from '../api/auth';

// Проверка доступа к финансовым разделам (отчёты, кассы, смены)
export const canAccessFinance = (role: UserRole | undefined): boolean => {
  if (!role) return false;
  return ['owner', 'admin', 'manager'].includes(role);
};

// Проверка админских прав
export const isAdmin = (role: UserRole | undefined): boolean => {
  if (!role) return false;
  return ['owner', 'admin'].includes(role);
};

// Проверка менеджерских прав и выше
export const isManagerOrAbove = (role: UserRole | undefined): boolean => {
  if (!role) return false;
  return ['owner', 'admin', 'manager'].includes(role);
};

// Мастер может видеть только свои записи
export const isMaster = (role: UserRole | undefined): boolean => {
  return role === 'master';
};
