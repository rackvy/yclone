import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CreateRefundDto } from "./dto/create-refund.dto";

@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) {}

    // Получить список методов оплаты (с автосозданием дефолтных если нет)
    async getPaymentMethods(companyId: string, branchId?: string) {
        // Автосид дефолтных методов и кассы если нет
        await this.seedDefaultPaymentMethods(companyId);
        await this.seedDefaultCashbox(companyId);

        return this.prisma.paymentMethod.findMany({
            where: {
                companyId,
                isActive: true,
                ...(branchId ? { branchId } : {}),
            },
            orderBy: { sortOrder: "asc" },
            select: {
                id: true,
                name: true,
                type: true,
                branchId: true,
            },
        });
    }

    // Создать платёж (приход)
    async createPayment(
        companyId: string,
        appointmentId: string,
        dto: CreatePaymentDto,
        createdByEmployeeId?: string,
    ) {
        // Проверяем запись
        const appointment = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: { 
                id: true, 
                branchId: true, 
                total: true,
                paidTotalKopeks: true,
            },
        });

        if (!appointment) {
            throw new NotFoundException("Запись не найдена");
        }

        // Проверяем метод оплаты
        const method = await this.prisma.paymentMethod.findFirst({
            where: { id: dto.methodId, companyId, isActive: true },
        });

        if (!method) {
            throw new NotFoundException("Способ оплаты не найден");
        }

        // Проверяем кассу
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id: dto.cashboxId, companyId, isActive: true },
        });

        if (!cashbox) {
            throw new NotFoundException("Касса не найдена или не активна");
        }

        // Создаём платёж
        const payment = await this.prisma.appointmentPayment.create({
            data: {
                companyId,
                branchId: appointment.branchId,
                appointmentId,
                methodId: dto.methodId,
                cashboxId: dto.cashboxId,
                direction: "income",
                amountKopeks: dto.amountKopeks,
                comment: dto.comment,
                createdByEmployeeId,
            },
        });

        // Пересчитываем статус оплаты
        await this.recalculatePaymentStatus(appointmentId);

        return payment;
    }

    // Создать возврат
    async createRefund(
        companyId: string,
        appointmentId: string,
        dto: CreateRefundDto,
        createdByEmployeeId?: string,
    ) {
        // Проверяем запись
        const appointment = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: { 
                id: true, 
                branchId: true, 
                paidTotalKopeks: true,
            },
        });

        if (!appointment) {
            throw new NotFoundException("Запись не найдена");
        }

        // Проверяем метод оплаты
        const method = await this.prisma.paymentMethod.findFirst({
            where: { id: dto.methodId, companyId, isActive: true },
        });

        if (!method) {
            throw new NotFoundException("Способ оплаты не найден");
        }

        // Проверяем кассу
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id: dto.cashboxId, companyId, isActive: true },
        });

        if (!cashbox) {
            throw new NotFoundException("Касса не найдена или не активна");
        }

        // Проверяем что возврат не превышает оплаченное
        if (dto.amountKopeks > appointment.paidTotalKopeks) {
            throw new BadRequestException("Сумма возврата не может превышать оплаченную сумму");
        }

        // Создаём возврат
        const refund = await this.prisma.appointmentPayment.create({
            data: {
                companyId,
                branchId: appointment.branchId,
                appointmentId,
                methodId: dto.methodId,
                cashboxId: dto.cashboxId,
                direction: "refund",
                amountKopeks: dto.amountKopeks,
                comment: dto.comment,
                createdByEmployeeId,
            },
        });

        // Пересчитываем статус оплаты
        await this.recalculatePaymentStatus(appointmentId);

        return refund;
    }

    // Получить список платежей по записи
    async getAppointmentPayments(companyId: string, appointmentId: string) {
        // Проверяем существование записи
        const appointment = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: { id: true },
        });

        if (!appointment) {
            throw new NotFoundException("Запись не найдена");
        }

        return this.prisma.appointmentPayment.findMany({
            where: { appointmentId, companyId },
            orderBy: { paidAt: "desc" },
            select: {
                id: true,
                direction: true,
                amountKopeks: true,
                paidAt: true,
                comment: true,
                method: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                cashbox: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
            },
        });
    }

    // Пересчитать статус оплаты записи
    private async recalculatePaymentStatus(appointmentId: string) {
        // Получаем все платежи записи
        const payments = await this.prisma.appointmentPayment.findMany({
            where: { appointmentId },
            select: { direction: true, amountKopeks: true },
        });

        // Считаем суммы
        const income = payments
            .filter(p => p.direction === "income")
            .reduce((sum, p) => sum + p.amountKopeks, 0);
        const refunds = payments
            .filter(p => p.direction === "refund")
            .reduce((sum, p) => sum + p.amountKopeks, 0);
        const paidTotalKopeks = income - refunds;

        // Получаем сумму записи
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { total: true },
        });

        if (!appointment) return;

        // Конвертируем total (рубли) в копейки
        const totalKopeks = appointment.total * 100;

        // Определяем статус
        let paymentStatus: "unpaid" | "partial" | "paid" | "refunded" = "unpaid";

        if (paidTotalKopeks <= 0 && refunds > 0 && income > 0) {
            paymentStatus = "refunded";
        } else if (paidTotalKopeks >= totalKopeks && totalKopeks > 0) {
            paymentStatus = "paid";
        } else if (paidTotalKopeks > 0 && paidTotalKopeks < totalKopeks) {
            paymentStatus = "partial";
        } else {
            paymentStatus = "unpaid";
        }

        // Обновляем запись
        await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                paidTotalKopeks,
                paymentStatus,
                isPaid: paymentStatus === "paid",
            },
        });
    }

    // Seed дефолтных методов оплаты для компании
    async seedDefaultPaymentMethods(companyId: string) {
        const existingCount = await this.prisma.paymentMethod.count({
            where: { companyId },
        });

        if (existingCount > 0) {
            return; // Уже есть методы
        }

        const defaults = [
            { name: "Наличные", type: "cash" as const, sortOrder: 10 },
            { name: "Карта", type: "card" as const, sortOrder: 20 },
            { name: "Перевод", type: "transfer" as const, sortOrder: 30 },
        ];

        for (const method of defaults) {
            await this.prisma.paymentMethod.create({
                data: {
                    companyId,
                    name: method.name,
                    type: method.type,
                    sortOrder: method.sortOrder,
                    isActive: true,
                },
            });
        }
    }

    // Seed дефолтной кассы для компании
    async seedDefaultCashbox(companyId: string) {
        const existingCount = await this.prisma.cashbox.count({
            where: { companyId },
        });

        if (existingCount > 0) {
            return; // Уже есть кассы
        }

        await this.prisma.cashbox.create({
            data: {
                companyId,
                name: "Основная касса",
                type: "cash",
                currency: "RUB",
                sortOrder: 100,
                isActive: true,
            },
        });
    }
}
