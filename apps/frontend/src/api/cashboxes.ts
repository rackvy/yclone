import { apiClient as api } from "./client";

export type CashboxType = "cash" | "bank" | "other";

export interface Cashbox {
    id: string;
    name: string;
    type: CashboxType;
    currency: string;
    isActive: boolean;
    branchId?: string;
    sortOrder: number;
    createdAt: string;
}

export interface CreateCashboxRequest {
    name: string;
    type: CashboxType;
    branchId?: string;
    currency?: string;
    sortOrder?: number;
}

export interface UpdateCashboxRequest {
    name?: string;
    type?: CashboxType;
    branchId?: string;
    currency?: string;
    isActive?: boolean;
    sortOrder?: number;
}

// Получить список касс
export const getCashboxes = (branchId?: string) =>
    api.get<Cashbox[]>(branchId ? `/api/cashboxes?branchId=${branchId}` : "/api/cashboxes");

// Создать кассу
export const createCashbox = (data: CreateCashboxRequest) =>
    api.post<Cashbox>("/api/cashboxes", data);

// Обновить кассу
export const updateCashbox = (id: string, data: UpdateCashboxRequest) =>
    api.patch<Cashbox>(`/api/cashboxes/${id}`, data);

// Удалить кассу (или деактивировать)
export const deleteCashbox = (id: string) =>
    api.delete<Cashbox>(`/api/cashboxes/${id}`);

// Переключить активность
export const toggleCashboxActive = (id: string) =>
    api.post<Cashbox>(`/api/cashboxes/${id}/toggle-active`, {});

// Хелпер: получить текст типа кассы
export const getCashboxTypeText = (type: CashboxType): string => {
    const map: Record<CashboxType, string> = {
        cash: "Наличные",
        bank: "Банк",
        other: "Другое",
    };
    return map[type];
};

// Хелпер: получить иконку типа кассы
export const getCashboxTypeIcon = (type: CashboxType): string => {
    const map: Record<CashboxType, string> = {
        cash: "payments",
        bank: "account_balance",
        other: "wallet",
    };
    return map[type];
};
