import { apiClient } from "./client";
import { PaymentStatus } from "./payments";

export interface Sale {
    id: string;
    companyId: string;
    branchId: string;
    clientId: string | null;
    totalKopeks: number;
    paidTotalKopeks: number;
    paymentStatus: PaymentStatus;
    createdAt: string;
    updatedAt: string;
    items: SaleItem[];
    client?: { fullName: string } | null;
    branch?: { name: string };
    payments: SalePayment[];
}

export interface SaleItem {
    id: string;
    saleId: string;
    productId: string;
    qty: number;
    priceKopeks: number;
    totalKopeks: number;
    product?: { name: string };
}

export interface SalePayment {
    id: string;
    saleId: string;
    methodId: string;
    cashboxId: string;
    direction: "income" | "refund";
    amountKopeks: number;
    paidAt: string;
    comment?: string;
    method?: { name: string };
    cashbox?: { name: string };
}

export interface CreateSaleRequest {
    branchId: string;
    clientId?: string;
    items: {
        productId: string;
        qty: number;
        priceKopeks: number;
    }[];
}

export interface AddSalePaymentRequest {
    methodId: string;
    cashboxId: string;
    amountKopeks: number;
    comment?: string;
}

export interface ListSalesParams {
    from?: string;
    to?: string;
    branchId?: string;
}

// Создать продажу
export const createSale = (data: CreateSaleRequest) =>
    apiClient.post<Sale>("/api/sales", data);

// Получить список продаж
export const getSales = (params?: ListSalesParams) => {
    const query = new URLSearchParams();
    if (params?.from) query.append("from", params.from);
    if (params?.to) query.append("to", params.to);
    if (params?.branchId) query.append("branchId", params.branchId);
    const queryStr = query.toString();
    return apiClient.get<Sale[]>(`/api/sales${queryStr ? `?${queryStr}` : ""}`);
};

// Получить детали продажи
export const getSale = (saleId: string) =>
    apiClient.get<Sale>(`/api/sales/${saleId}`);

// Добавить платеж
export const addSalePayment = (saleId: string, data: AddSalePaymentRequest) =>
    apiClient.post<Sale>(`/api/sales/${saleId}/payments`, data);

// Хелпер: форматировать сумму в рубли
export const formatRubles = (rubles: number) => {
    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 0,
    }).format(rubles);
};

// Хелпер: получить остаток к оплате
export const getRemainingAmount = (sale: Sale) => {
    return sale.totalKopeks - sale.paidTotalKopeks;
};

// Хелпер: статус оплаты текстом
export const getPaymentStatusText = (status: PaymentStatus) => {
    const map: Record<PaymentStatus, string> = {
        unpaid: "Не оплачено",
        partial: "Частично оплачено",
        paid: "Оплачено",
        refunded: "Возвращено",
    };
    return map[status];
};
