import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCashboxDto } from "./dto/create-cashbox.dto";
import { UpdateCashboxDto } from "./dto/update-cashbox.dto";

@Injectable()
export class CashboxesService {
    constructor(private readonly prisma: PrismaService) {}

    // Список касс компании
    async findAll(companyId: string, branchId?: string) {
        return this.prisma.cashbox.findMany({
            where: {
                companyId,
                ...(branchId ? { branchId } : {}),
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                name: true,
                type: true,
                currency: true,
                isActive: true,
                branchId: true,
                sortOrder: true,
                createdAt: true,
            },
        });
    }

    // Создать кассу
    async create(companyId: string, dto: CreateCashboxDto) {
        return this.prisma.cashbox.create({
            data: {
                companyId,
                name: dto.name,
                type: dto.type,
                branchId: dto.branchId,
                currency: dto.currency || "RUB",
                sortOrder: dto.sortOrder ?? 100,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                type: true,
                currency: true,
                isActive: true,
                branchId: true,
                sortOrder: true,
                createdAt: true,
            },
        });
    }

    // Обновить кассу
    async update(companyId: string, id: string, dto: UpdateCashboxDto) {
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id, companyId },
            select: { id: true },
        });

        if (!cashbox) {
            throw new NotFoundException("Касса не найдена");
        }

        return this.prisma.cashbox.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.branchId !== undefined && { branchId: dto.branchId }),
                ...(dto.currency !== undefined && { currency: dto.currency }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            },
            select: {
                id: true,
                name: true,
                type: true,
                currency: true,
                isActive: true,
                branchId: true,
                sortOrder: true,
                createdAt: true,
            },
        });
    }

    // Удалить кассу
    async remove(companyId: string, id: string) {
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id, companyId },
            select: { id: true },
        });

        if (!cashbox) {
            throw new NotFoundException("Касса не найдена");
        }

        // Проверяем, есть ли платежи по этой кассе
        const paymentsCount = await this.prisma.appointmentPayment.count({
            where: { cashboxId: id },
        });

        if (paymentsCount > 0) {
            // Деактивируем вместо удаления
            return this.prisma.cashbox.update({
                where: { id },
                data: { isActive: false },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    currency: true,
                    isActive: true,
                    branchId: true,
                    sortOrder: true,
                    createdAt: true,
                },
            });
        }

        return this.prisma.cashbox.delete({
            where: { id },
            select: {
                id: true,
                name: true,
                type: true,
                currency: true,
                isActive: true,
                branchId: true,
                sortOrder: true,
                createdAt: true,
            },
        });
    }

    // Переключить активность
    async toggleActive(companyId: string, id: string) {
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id, companyId },
            select: { id: true, isActive: true },
        });

        if (!cashbox) {
            throw new NotFoundException("Касса не найдена");
        }

        return this.prisma.cashbox.update({
            where: { id },
            data: { isActive: !cashbox.isActive },
            select: {
                id: true,
                name: true,
                type: true,
                currency: true,
                isActive: true,
                branchId: true,
                sortOrder: true,
                createdAt: true,
            },
        });
    }
}
