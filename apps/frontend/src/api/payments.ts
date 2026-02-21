import { apiClient as api } from "./client";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentDirection = "income" | "refund";
export type PaymentMethodType = "cash" | "card" | "transfer" | "other";

export interface PaymentMethod {
    id: string;
    name: string;
    type: PaymentMethodType;
    branchId?: string;
}

export interface Payment {
    id: string;
    direction: PaymentDirection;
    amountKopeks: number;
    paidAt: string;
    comment?: string;
    method: PaymentMethod;
    cashbox?: {
        id: string;
        name: string;
        type: string;
    };
}

export interface CreatePaymentRequest {
    methodId: string;
    cashboxId: string;
    amountKopeks: number;
    comment?: string;
}

export interface CreateRefundRequest {
    methodId: string;
    cashboxId: string;
    amountKopeks: number;
    comment?: string;
}

// Получить способы оплаты
export const getPaymentMethods = (branchId?: string) =>
    api.get<PaymentMethod[]>(branchId ? `/api/payment-methods?branchId=${branchId}` : "/api/payment-methods");

// Получить платежи по записи
export const getAppointmentPayments = (appointmentId: string) =>
    api.get<Payment[]>(`/api/appointments/${appointmentId}/payments`);

// Создать платёж (приход)
export const createPayment = (appointmentId: string, data: CreatePaymentRequest) =>
    api.post<Payment>(`/api/appointments/${appointmentId}/payments`, data);

// Создать возврат
export const createRefund = (appointmentId: string, data: CreateRefundRequest) =>
    api.post<Payment>(`/api/appointments/${appointmentId}/refunds`, data);

// Хелпер: конвертировать рубли в копейки
export const rublesToKopeks = (rubles: number): number => Math.round(rubles * 100);

// Хелпер: конвертировать копейки в рубли
export const kopeksToRubles = (kopeks: number): number => kopeks / 100;

// Хелпер: форматировать сумму в рублях
export const formatRubles = (kopeks: number): string => {
    const rubles = kopeksToRubles(kopeks);
    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: rubles % 1 === 0 ? 0 : 2,
    }).format(rubles);
};

// Хелпер: получить текст статуса оплаты
export const getPaymentStatusText = (status: PaymentStatus): string => {
    const map: Record<PaymentStatus, string> = {
        unpaid: "Не оплачено",
        partial: "Частично",
        paid: "Оплачено",
        refunded: "Возвращено",
    };
    return map[status];
};

// Хелпер: получить цвет статуса оплаты
export const getPaymentStatusColor = (status: PaymentStatus): string => {
    const map: Record<PaymentStatus, string> = {
        unpaid: "bg-red-100 text-red-800",
        partial: "bg-yellow-100 text-yellow-800",
        paid: "bg-green-100 text-green-800",
        refunded: "bg-gray-100 text-gray-800",
    };
    return map[status];
};
