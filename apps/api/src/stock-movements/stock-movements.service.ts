import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StockMovementsService {
    constructor(private readonly prisma: PrismaService) {}

    private async assertBranch(companyId: string, branchId: string) {
        const b = await this.prisma.branch.findFirst({
            where: { id: branchId, companyId },
            select: { id: true },
        });
        if (!b) throw new BadRequestException("Branch does not belong to your company");
    }

    private async getProduct(companyId: string, productId: string) {
        const p = await this.prisma.product.findFirst({
            where: { id: productId, companyId },
            select: { id: true, branchId: true, stockQty: true, isActive: true, name: true },
        });
        if (!p) throw new NotFoundException("Product not found");
        if (!p.isActive) throw new BadRequestException("Product is not active");
        return p;
    }

    private async assertEmployee(companyId: string, employeeId: string) {
        const e = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true },
        });
        if (!e) throw new BadRequestException("Employee does not belong to your company");
    }

    async list(companyId: string, branchId: string, productId?: string, take = 100) {
        await this.assertBranch(companyId, branchId);
        const takeSafe = Math.min(Math.max(Number(take) || 100, 1), 300);

        return this.prisma.stockMovement.findMany({
            where: {
                companyId,
                branchId,
                ...(productId ? { productId } : {}),
            },
            orderBy: [{ createdAt: "desc" }],
            take: takeSafe,
            select: {
                id: true,
                type: true,
                qty: true,
                note: true,
                createdAt: true,
                productId: true,
                product: { select: { id: true, name: true } },
                appointmentId: true,
                createdByEmployeeId: true,
                createdByEmployee: { select: { id: true, fullName: true } },
            },
        });
    }

    async in(companyId: string, dto: { branchId: string; productId: string; qty: number; note?: string; createdByEmployeeId?: string }) {
        await this.assertBranch(companyId, dto.branchId);
        const p = await this.getProduct(companyId, dto.productId);

        if (p.branchId !== dto.branchId) {
            throw new BadRequestException("Product belongs to another branch");
        }
        if (dto.createdByEmployeeId) await this.assertEmployee(companyId, dto.createdByEmployeeId);

        return this.prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    productId: dto.productId,
                    type: "in",
                    qty: dto.qty,
                    note: dto.note?.trim() || null,
                    createdByEmployeeId: dto.createdByEmployeeId ?? null,
                },
                select: {
                    id: true,
                    type: true,
                    qty: true,
                    note: true,
                    createdAt: true,
                    productId: true,
                },
            });

            const product = await tx.product.update({
                where: { id: dto.productId },
                data: { stockQty: { increment: dto.qty } },
                select: { id: true, stockQty: true },
            });

            return { movement, product };
        });
    }

    async out(companyId: string, dto: { branchId: string; productId: string; qty: number; note?: string; createdByEmployeeId?: string }) {
        await this.assertBranch(companyId, dto.branchId);
        const p = await this.getProduct(companyId, dto.productId);

        if (p.branchId !== dto.branchId) {
            throw new BadRequestException("Product belongs to another branch");
        }
        if (dto.createdByEmployeeId) await this.assertEmployee(companyId, dto.createdByEmployeeId);

        return this.prisma.$transaction(async (tx) => {
            // важный момент: проверяем остаток в транзакции
            const current = await tx.product.findUnique({
                where: { id: dto.productId },
                select: { stockQty: true },
            });
            if (!current) throw new NotFoundException("Product not found");
            if (current.stockQty < dto.qty) throw new BadRequestException("Not enough stock");

            const movement = await tx.stockMovement.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    productId: dto.productId,
                    type: "out",
                    qty: dto.qty,
                    note: dto.note?.trim() || null,
                    createdByEmployeeId: dto.createdByEmployeeId ?? null,
                },
                select: {
                    id: true,
                    type: true,
                    qty: true,
                    note: true,
                    createdAt: true,
                    productId: true,
                },
            });

            const product = await tx.product.update({
                where: { id: dto.productId },
                data: { stockQty: { decrement: dto.qty } },
                select: { id: true, stockQty: true },
            });

            return { movement, product };
        });
    }

    async adjust(companyId: string, dto: { branchId: string; productId: string; newQty: number; note?: string; createdByEmployeeId?: string }) {
        await this.assertBranch(companyId, dto.branchId);
        const p = await this.getProduct(companyId, dto.productId);

        if (p.branchId !== dto.branchId) {
            throw new BadRequestException("Product belongs to another branch");
        }
        if (dto.createdByEmployeeId) await this.assertEmployee(companyId, dto.createdByEmployeeId);

        return this.prisma.$transaction(async (tx) => {
            const current = await tx.product.findUnique({
                where: { id: dto.productId },
                select: { stockQty: true },
            });
            if (!current) throw new NotFoundException("Product not found");

            const diff = dto.newQty - current.stockQty; // может быть +/-
            const movementType = "adjust";

            const movement = await tx.stockMovement.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    productId: dto.productId,
                    type: movementType,
                    qty: Math.abs(diff) === 0 ? 0 : Math.abs(diff), // для adjust qty храним величину изменения (модно так)
                    note: (dto.note?.trim() || "") + (diff === 0 ? "" : ` (diff ${diff})`),
                    createdByEmployeeId: dto.createdByEmployeeId ?? null,
                },
                select: { id: true, type: true, qty: true, note: true, createdAt: true, productId: true },
            });

            const product = await tx.product.update({
                where: { id: dto.productId },
                data: { stockQty: dto.newQty },
                select: { id: true, stockQty: true },
            });

            return { movement, product };
        });
    }

    async transfer(companyId: string, dto: { fromBranchId: string; toBranchId: string; productId: string; qty: number; note?: string; createdByEmployeeId?: string }) {
        await this.assertBranch(companyId, dto.fromBranchId);
        await this.assertBranch(companyId, dto.toBranchId);
        const p = await this.getProduct(companyId, dto.productId);

        if (p.branchId !== dto.fromBranchId) {
            throw new BadRequestException("Product belongs to another branch");
        }
        if (dto.createdByEmployeeId) await this.assertEmployee(companyId, dto.createdByEmployeeId);

        return this.prisma.$transaction(async (tx) => {
            // Проверяем остаток
            const current = await tx.product.findUnique({
                where: { id: dto.productId },
                select: { stockQty: true, name: true, price: true, sku: true, barcode: true, categoryId: true },
            });
            if (!current) throw new NotFoundException("Product not found");
            if (current.stockQty < dto.qty) throw new BadRequestException("Not enough stock");

            // Списываем с исходного филиала
            const outMovement = await tx.stockMovement.create({
                data: {
                    companyId,
                    branchId: dto.fromBranchId,
                    productId: dto.productId,
                    type: "out",
                    qty: dto.qty,
                    note: `Перемещение в филиал ${dto.toBranchId}. ${dto.note || ""}`.trim(),
                    createdByEmployeeId: dto.createdByEmployeeId ?? null,
                },
            });

            await tx.product.update({
                where: { id: dto.productId },
                data: { stockQty: { decrement: dto.qty } },
            });

            // Создаем или находим товар в целевом филиале
            let targetProduct = await tx.product.findFirst({
                where: {
                    companyId,
                    branchId: dto.toBranchId,
                    name: current.name,
                },
            });

            if (targetProduct) {
                // Обновляем остаток существующего
                await tx.product.update({
                    where: { id: targetProduct.id },
                    data: { stockQty: { increment: dto.qty } },
                });
            } else {
                // Создаем новый товар в целевом филиале
                targetProduct = await tx.product.create({
                    data: {
                        companyId,
                        branchId: dto.toBranchId,
                        name: current.name,
                        price: current.price,
                        sku: current.sku,
                        barcode: current.barcode,
                        categoryId: current.categoryId,
                        stockQty: dto.qty,
                        isActive: true,
                    },
                });
            }

            // Приход в целевой филиал
            const inMovement = await tx.stockMovement.create({
                data: {
                    companyId,
                    branchId: dto.toBranchId,
                    productId: targetProduct.id,
                    type: "in",
                    qty: dto.qty,
                    note: `Перемещение из филиала ${dto.fromBranchId}. ${dto.note || ""}`.trim(),
                    createdByEmployeeId: dto.createdByEmployeeId ?? null,
                },
            });

            return { outMovement, inMovement, targetProduct };
        });
    }
}
