import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) {}

    // Хелпер: парсим дату с компенсацией часового пояса
    // Возвращает начало дня (00:00:00) в UTC
    private parseDateWithTimezone(dateStr: string): Date {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Создаём дату как UTC midnight
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    // Отчёт по кассам за день
    async getCashboxDayReport(companyId: string, date: string, branchId?: string) {
        // Парсим дату
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Получаем все платежи за день
        const payments = await this.prisma.appointmentPayment.findMany({
            where: {
                companyId,
                ...(branchId ? { branchId } : {}),
                paidAt: {
                    gte: dayStart,
                    lte: dayEnd,
                },
            },
            select: {
                direction: true,
                amountKopeks: true,
                cashboxId: true,
                methodId: true,
                cashbox: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                method: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
            },
        });

        // Группируем по кассам
        const cashboxMap = new Map<string, {
            cashboxId: string;
            cashboxName: string;
            cashboxType: string;
            income: number;
            refund: number;
            total: number;
            methods: Map<string, {
                methodId: string;
                methodName: string;
                methodType: string;
                income: number;
                refund: number;
                total: number;
            }>;
        }>();

        for (const payment of payments) {
            if (!payment.cashbox) continue;

            const cbId = payment.cashbox.id;
            if (!cashboxMap.has(cbId)) {
                cashboxMap.set(cbId, {
                    cashboxId: cbId,
                    cashboxName: payment.cashbox.name,
                    cashboxType: payment.cashbox.type,
                    income: 0,
                    refund: 0,
                    total: 0,
                    methods: new Map(),
                });
            }

            const cb = cashboxMap.get(cbId)!;
            const amount = payment.amountKopeks;

            if (payment.direction === "income") {
                cb.income += amount;
                cb.total += amount;
            } else {
                cb.refund += amount;
                cb.total -= amount;
            }

            // Группировка по методам
            const methodId = payment.method?.id || "unknown";
            if (!cb.methods.has(methodId)) {
                cb.methods.set(methodId, {
                    methodId,
                    methodName: payment.method?.name || "Неизвестно",
                    methodType: payment.method?.type || "other",
                    income: 0,
                    refund: 0,
                    total: 0,
                });
            }

            const method = cb.methods.get(methodId)!;
            if (payment.direction === "income") {
                method.income += amount;
                method.total += amount;
            } else {
                method.refund += amount;
                method.total -= amount;
            }
        }

        // Преобразуем в массив
        const cashboxes = Array.from(cashboxMap.values()).map(cb => ({
            cashboxId: cb.cashboxId,
            cashboxName: cb.cashboxName,
            cashboxType: cb.cashboxType,
            incomeKopeks: cb.income,
            refundKopeks: cb.refund,
            totalKopeks: cb.total,
            methods: Array.from(cb.methods.values()).map(m => ({
                methodId: m.methodId,
                methodName: m.methodName,
                methodType: m.methodType,
                incomeKopeks: m.income,
                refundKopeks: m.refund,
                totalKopeks: m.total,
            })),
        }));

        // Общие итоги
        const totalIncome = cashboxes.reduce((sum, cb) => sum + cb.incomeKopeks, 0);
        const totalRefund = cashboxes.reduce((sum, cb) => sum + cb.refundKopeks, 0);

        return {
            date,
            branchId: branchId || null,
            cashboxes,
            summary: {
                totalIncomeKopeks: totalIncome,
                totalRefundKopeks: totalRefund,
                totalNetKopeks: totalIncome - totalRefund,
            },
        };
    }

    // ==================== STAGE 5: Finance Reports ====================

    // Сводный отчёт по выручке
    async getSummaryReport(companyId: string, from: string, to: string, branchId?: string) {
        const fromDate = this.parseDateWithTimezone(from);
        // Конец дня to: создаём новую дату на 1 день позже и вычитаем 1 мс
        const [year, month, day] = to.split('-').map(Number);
        const toDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, -1));

        // Платежи за записи (услуги)
        const appointmentPayments = await this.prisma.appointmentPayment.findMany({
            where: {
                companyId,
                ...(branchId ? { branchId } : {}),
                direction: "income",
                paidAt: { gte: fromDate, lte: toDate },
            },
            select: { amountKopeks: true, methodId: true, cashboxId: true },
        });

        // Платежи за продажи товаров (через POS)
        const salePayments = await this.prisma.salePayment.findMany({
            where: {
                companyId,
                ...(branchId ? { branchId } : {}),
                direction: "income",
                paidAt: { gte: fromDate, lte: toDate },
            },
            select: { amountKopeks: true, methodId: true, cashboxId: true },
        });

        // Товары, проданные через записи (AppointmentProduct)
        const appointmentProducts = await this.prisma.appointmentProduct.findMany({
            where: {
                appointment: {
                    companyId,
                    ...(branchId ? { branchId } : {}),
                    paymentStatus: "paid",
                    startAt: { gte: fromDate, lte: toDate },
                },
            },
            select: {
                price: true,
                qty: true,
            },
        });

        // Выручка по категориям
        const revenueServices = appointmentPayments.reduce((sum, p) => sum + p.amountKopeks, 0);
        const revenueProductsPOS = salePayments.reduce((sum, p) => sum + p.amountKopeks, 0);
        // price в AppointmentProduct хранится в рублях, умножаем на 100 для копеек
        const revenueProductsAppointments = appointmentProducts.reduce((sum, item) => sum + (item.price * item.qty * 100), 0);
        const revenueProducts = revenueProductsPOS + revenueProductsAppointments;

        // Группировка по методам оплаты
        const methodMap = new Map<string, { methodId: string; name: string; amount: number }>();
        const methods = await this.prisma.paymentMethod.findMany({ where: { companyId } });
        for (const m of methods) {
            methodMap.set(m.id, { methodId: m.id, name: m.name, amount: 0 });
        }
        for (const p of [...appointmentPayments, ...salePayments]) {
            const entry = methodMap.get(p.methodId);
            if (entry) entry.amount += p.amountKopeks;
        }

        // Группировка по кассам
        const cashboxMap = new Map<string, { cashboxId: string; name: string; amount: number }>();
        const cashboxes = await this.prisma.cashbox.findMany({ where: { companyId, isActive: true } });
        for (const c of cashboxes) {
            cashboxMap.set(c.id, { cashboxId: c.id, name: c.name, amount: 0 });
        }
        for (const p of [...appointmentPayments, ...salePayments]) {
            if (!p.cashboxId) continue;
            const entry = cashboxMap.get(p.cashboxId);
            if (entry) entry.amount += p.amountKopeks;
        }

        return {
            period: { from, to, branchId: branchId || null },
            revenue: {
                servicesKopeks: revenueServices,
                productsKopeks: revenueProducts,
                totalKopeks: revenueServices + revenueProducts,
            },
            byMethod: Array.from(methodMap.values()).filter(m => m.amount > 0),
            byCashbox: Array.from(cashboxMap.values()).filter(c => c.amount > 0),
        };
    }

    // Отчёт по мастерам
    async getMastersReport(companyId: string, from: string, to: string, branchId?: string) {
        const fromDate = this.parseDateWithTimezone(from);
        // Конец дня to: создаём новую дату на 1 день позже и вычитаем 1 мс
        const [year, month, day] = to.split('-').map(Number);
        const toDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, -1));

        console.log('[getMastersReport] date range:', fromDate, 'to', toDate, 'branchId:', branchId);

        // Получаем выполненные записи по мастерам (оплаченные)
        const appointments = await this.prisma.appointment.findMany({
            where: {
                companyId,
                ...(branchId ? { branchId } : {}),
                paymentStatus: "paid",
                startAt: { gte: fromDate, lte: toDate },
            },
            select: {
                masterEmployeeId: true,
                paidTotalKopeks: true,
                masterEmployee: { select: { id: true, fullName: true } },
            },
        });

        // Группировка по мастерам
        const masterMap = new Map<string, {
            masterId: string;
            fullName: string;
            appointmentsDone: number;
            revenueKopeks: number;
        }>();

        for (const a of appointments) {
            if (!a.masterEmployeeId || !a.masterEmployee) continue;
            const id = a.masterEmployeeId;
            if (!masterMap.has(id)) {
                masterMap.set(id, {
                    masterId: id,
                    fullName: a.masterEmployee.fullName,
                    appointmentsDone: 0,
                    revenueKopeks: 0,
                });
            }
            const m = masterMap.get(id)!;
            m.appointmentsDone += 1;
            m.revenueKopeks += a.paidTotalKopeks;
        }

        console.log('[getMastersReport] found appointments:', appointments.length, 'masters:', masterMap.size);

        const masters = Array.from(masterMap.values()).map(m => ({
            ...m,
            avgCheckKopeks: m.appointmentsDone > 0 ? Math.round(m.revenueKopeks / m.appointmentsDone) : 0,
        }));

        // Сортируем по выручке
        masters.sort((a, b) => b.revenueKopeks - a.revenueKopeks);

        return {
            period: { from, to, branchId: branchId || null },
            masters,
            summary: {
                totalAppointments: masters.reduce((s, m) => s + m.appointmentsDone, 0),
                totalRevenueKopeks: masters.reduce((s, m) => s + m.revenueKopeks, 0),
            },
        };
    }

    // Отчёт по товарам (топ продаж)
    async getProductsReport(companyId: string, from: string, to: string, branchId?: string) {
        const fromDate = this.parseDateWithTimezone(from);
        // Конец дня to: создаём новую дату на 1 день позже и вычитаем 1 мс
        const [year, month, day] = to.split('-').map(Number);
        const toDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, -1));

        // Продажи товаров через POS
        const saleItems = await this.prisma.saleItem.findMany({
            where: {
                sale: {
                    companyId,
                    ...(branchId ? { branchId } : {}),
                    createdAt: { gte: fromDate, lte: toDate },
                },
            },
            select: {
                qty: true,
                priceKopeks: true,
                productId: true,
                product: { select: { id: true, name: true, sku: true } },
            },
        });

        // Товары, проданные через записи
        const appointmentProducts = await this.prisma.appointmentProduct.findMany({
            where: {
                appointment: {
                    companyId,
                    ...(branchId ? { branchId } : {}),
                    paymentStatus: "paid",
                    startAt: { gte: fromDate, lte: toDate },
                },
            },
            select: {
                qty: true,
                price: true,
                productId: true,
                product: { select: { id: true, name: true, sku: true } },
            },
        });

        // Группировка по товарам
        const productMap = new Map<string, {
            productId: string;
            name: string;
            sku: string;
            qtySold: number;
            revenueKopeks: number;
        }>();

        // Обрабатываем POS-продажи
        for (const item of saleItems) {
            if (!item.productId || !item.product) continue;
            const id = item.productId;
            if (!productMap.has(id)) {
                productMap.set(id, {
                    productId: id,
                    name: item.product.name,
                    sku: item.product.sku || '',
                    qtySold: 0,
                    revenueKopeks: 0,
                });
            }
            const p = productMap.get(id)!;
            p.qtySold += item.qty;
            p.revenueKopeks += item.priceKopeks * item.qty;
        }

        // Обрабатываем товары из записей (price в рублях, умножаем на 100)
        for (const item of appointmentProducts) {
            if (!item.productId || !item.product) continue;
            const id = item.productId;
            if (!productMap.has(id)) {
                productMap.set(id, {
                    productId: id,
                    name: item.product.name,
                    sku: item.product.sku || '',
                    qtySold: 0,
                    revenueKopeks: 0,
                });
            }
            const p = productMap.get(id)!;
            p.qtySold += item.qty;
            p.revenueKopeks += item.price * item.qty * 100; // price в рублях
        }

        const products = Array.from(productMap.values());
        // Сортируем по количеству продаж
        products.sort((a, b) => b.qtySold - a.qtySold);

        return {
            period: { from, to, branchId: branchId || null },
            products: products.slice(0, 20), // Топ-20
            summary: {
                totalItemsSold: products.reduce((s, p) => s + p.qtySold, 0),
                totalRevenueKopeks: products.reduce((s, p) => s + p.revenueKopeks, 0),
            },
        };
    }
}
