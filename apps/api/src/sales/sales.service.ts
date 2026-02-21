import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { ListSalesDto } from "./dto/list-sales.dto";

@Injectable()
export class SalesService {
    constructor(private readonly prisma: PrismaService) {}

    // Создать продажу
    async createSale(companyId: string, employeeId: string | undefined, dto: CreateSaleDto) {
        // Проверяем филиал
        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId },
        });
        if (!branch) {
            throw new NotFoundException("Филиал не найден");
        }

        // Проверяем клиента если указан
        if (dto.clientId) {
            const client = await this.prisma.client.findFirst({
                where: { id: dto.clientId, companyId },
            });
            if (!client) {
                throw new NotFoundException("Клиент не найден");
            }
        }

        // Проверяем продукты и считаем общую сумму
        let totalKopeks = 0;
        const itemsWithData: Array<{
            productId: string;
            qty: number;
            priceKopeks: number;
            totalKopeks: number;
        }> = [];

        for (const item of dto.items) {
            const product = await this.prisma.product.findFirst({
                where: { id: item.productId, companyId, branchId: dto.branchId },
            });
            if (!product) {
                throw new NotFoundException(`Товар не найден: ${item.productId}`);
            }
            if (product.stockQty < item.qty) {
                throw new BadRequestException(
                    `Недостаточно товара "${product.name}" на складе. Доступно: ${product.stockQty}, требуется: ${item.qty}`
                );
            }

            const itemTotal = item.priceKopeks * item.qty;
            totalKopeks += itemTotal;
            itemsWithData.push({
                ...item,
                totalKopeks: itemTotal,
            });
        }

        // Создаем продажу в транзакции
        const sale = await this.prisma.$transaction(async (tx) => {
            // Создаем продажу
            const newSale = await tx.sale.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    clientId: dto.clientId,
                    totalKopeks,
                    paidTotalKopeks: 0,
                    paymentStatus: "unpaid",
                    createdByEmployeeId: employeeId,
                },
            });

            // Создаем элементы продажи и списываем со склада
            for (const item of itemsWithData) {
                // Создаем элемент продажи
                await tx.saleItem.create({
                    data: {
                        saleId: newSale.id,
                        productId: item.productId,
                        qty: item.qty,
                        priceKopeks: item.priceKopeks,
                        totalKopeks: item.totalKopeks,
                    },
                });

                // Уменьшаем количество на складе
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stockQty: { decrement: item.qty } },
                });

                // Создаем движение по складу
                await tx.stockMovement.create({
                    data: {
                        companyId,
                        branchId: dto.branchId,
                        productId: item.productId,
                        type: "sale",
                        qty: item.qty,
                        saleId: newSale.id,
                        note: `Продажа #${newSale.id.slice(-6)}`,
                        createdByEmployeeId: employeeId,
                    },
                });
            }

            return newSale;
        });

        return this.prisma.sale.findUnique({
            where: { id: sale.id },
            include: {
                items: { include: { product: true } },
                client: true,
                payments: true,
            },
        });
    }

    // Добавить платеж
    async addPayment(
        companyId: string,
        employeeId: string | undefined,
        saleId: string,
        dto: AddPaymentDto
    ) {
        // Проверяем продажу
        const sale = await this.prisma.sale.findFirst({
            where: { id: saleId, companyId },
            include: { payments: true },
        });
        if (!sale) {
            throw new NotFoundException("Продажа не найдена");
        }

        // Проверяем метод оплаты
        const method = await this.prisma.paymentMethod.findFirst({
            where: { id: dto.methodId, companyId, isActive: true },
        });
        if (!method) {
            throw new NotFoundException("Способ оплаты не найден или не активен");
        }

        // Проверяем кассу
        const cashbox = await this.prisma.cashbox.findFirst({
            where: { id: dto.cashboxId, companyId, isActive: true },
        });
        if (!cashbox) {
            throw new NotFoundException("Касса не найдена или не активна");
        }

        // Создаем платеж и обновляем статус
        const payment = await this.prisma.$transaction(async (tx) => {
            // Создаем платеж
            const newPayment = await tx.salePayment.create({
                data: {
                    companyId,
                    branchId: sale.branchId,
                    saleId,
                    methodId: dto.methodId,
                    cashboxId: dto.cashboxId,
                    direction: "income",
                    amountKopeks: dto.amountKopeks,
                    comment: dto.comment,
                    createdByEmployeeId: employeeId,
                },
            });

            // Пересчитываем оплаченную сумму
            const allPayments = await tx.salePayment.findMany({
                where: { saleId, direction: "income" },
            });
            const paidTotal = allPayments.reduce((sum, p) => sum + p.amountKopeks, 0);

            // Определяем статус оплаты
            let paymentStatus = sale.paymentStatus;
            if (paidTotal >= sale.totalKopeks) {
                paymentStatus = "paid";
            } else if (paidTotal > 0) {
                paymentStatus = "partial";
            }

            // Обновляем продажу
            await tx.sale.update({
                where: { id: saleId },
                data: {
                    paidTotalKopeks: paidTotal,
                    paymentStatus,
                },
            });

            return newPayment;
        });

        return this.getSaleById(companyId, saleId);
    }

    // Получить продажу по ID
    async getSaleById(companyId: string, saleId: string) {
        const sale = await this.prisma.sale.findFirst({
            where: { id: saleId, companyId },
            include: {
                items: {
                    include: { product: true },
                },
                client: true,
                payments: {
                    include: { method: true, cashbox: true },
                    orderBy: { paidAt: "desc" },
                },
                branch: true,
            },
        });

        if (!sale) {
            throw new NotFoundException("Продажа не найдена");
        }

        return sale;
    }

    // Список продаж
    async listSales(companyId: string, dto: ListSalesDto) {
        const where: any = { companyId };

        if (dto.branchId) {
            where.branchId = dto.branchId;
        }

        if (dto.from || dto.to) {
            where.createdAt = {};
            if (dto.from) {
                where.createdAt.gte = new Date(dto.from);
            }
            if (dto.to) {
                const toDate = new Date(dto.to);
                toDate.setDate(toDate.getDate() + 1);
                where.createdAt.lt = toDate;
            }
        }

        const sales = await this.prisma.sale.findMany({
            where,
            include: {
                items: {
                    include: { product: { select: { name: true } } },
                },
                client: { select: { fullName: true } },
                branch: { select: { name: true } },
                payments: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return sales;
    }
}
