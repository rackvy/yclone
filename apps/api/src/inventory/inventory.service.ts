import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInventoryCountDto, UpdateInventoryCountDto } from "./dto/inventory-count.dto";

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string, branchId?: string, status?: string) {
        return this.prisma.inventoryCount.findMany({
            where: {
                companyId,
                ...(branchId && { branchId }),
                ...(status && { status }),
            },
            orderBy: { createdAt: "desc" },
            include: {
                branch: { select: { id: true, name: true } },
                createdByEmployee: { select: { id: true, fullName: true } },
                _count: { select: { items: true } },
            },
        });
    }

    async getOne(companyId: string, id: string) {
        const inventory = await this.prisma.inventoryCount.findFirst({
            where: { id, companyId },
            include: {
                branch: { select: { id: true, name: true } },
                createdByEmployee: { select: { id: true, fullName: true } },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                price: true,
                                costPrice: true,
                                stockQty: true,
                            },
                        },
                    },
                },
            },
        });
        if (!inventory) throw new NotFoundException("Inventory count not found");
        return inventory;
    }

    async create(companyId: string, employeeId: string | undefined, dto: CreateInventoryCountDto) {
        // Verify branch
        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId },
            select: { id: true },
        });
        if (!branch) throw new BadRequestException("Branch not found");

        // Get all products for this branch
        const products = await this.prisma.product.findMany({
            where: { branchId: dto.branchId, isActive: true },
            select: { id: true, stockQty: true },
        });

        // Create inventory count with items
        const items = products.map(p => {
            const dtoItem = dto.items.find(i => i.productId === p.id);
            const actualQty = dtoItem?.actualQty ?? p.stockQty;
            return {
                productId: p.id,
                expectedQty: p.stockQty,
                actualQty,
                difference: actualQty - p.stockQty,
            };
        });

        return this.prisma.inventoryCount.create({
            data: {
                companyId,
                branchId: dto.branchId,
                createdByEmployeeId: employeeId || null,
                items: {
                    create: items,
                },
            },
            include: {
                branch: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                    },
                },
            },
        });
    }

    async updateItem(companyId: string, inventoryId: string, itemId: string, actualQty: number) {
        // Verify ownership
        const inventory = await this.prisma.inventoryCount.findFirst({
            where: { id: inventoryId, companyId },
            select: { id: true, status: true },
        });
        if (!inventory) throw new NotFoundException("Inventory count not found");
        if (inventory.status !== "draft") {
            throw new BadRequestException("Can only update items in draft status");
        }

        const item = await this.prisma.inventoryCountItem.findFirst({
            where: { id: itemId, inventoryCountId: inventoryId },
            select: { id: true, expectedQty: true },
        });
        if (!item) throw new NotFoundException("Item not found");

        return this.prisma.inventoryCountItem.update({
            where: { id: itemId },
            data: {
                actualQty,
                difference: actualQty - item.expectedQty,
            },
        });
    }

    async complete(companyId: string, id: string, applyStock: boolean) {
        const inventory = await this.prisma.inventoryCount.findFirst({
            where: { id, companyId },
            include: { items: true },
        });
        if (!inventory) throw new NotFoundException("Inventory count not found");
        if (inventory.status !== "draft") {
            throw new BadRequestException("Inventory already completed or canceled");
        }

        // If applyStock is true, update product stock quantities
        if (applyStock) {
            for (const item of inventory.items) {
                await this.prisma.product.update({
                    where: { id: item.productId },
                    data: { stockQty: item.actualQty },
                });

                // Create stock movement if there's a difference
                if (item.difference !== 0) {
                    await this.prisma.stockMovement.create({
                        data: {
                            companyId,
                            branchId: inventory.branchId,
                            productId: item.productId,
                            type: item.difference > 0 ? "in" : "out",
                            qty: Math.abs(item.difference),
                            note: `Инвентаризация #${id.slice(0, 8)}`,
                        },
                    });
                }
            }
        }

        return this.prisma.inventoryCount.update({
            where: { id },
            data: {
                status: "completed",
                completedAt: new Date(),
            },
        });
    }

    async cancel(companyId: string, id: string) {
        const inventory = await this.prisma.inventoryCount.findFirst({
            where: { id, companyId },
            select: { id: true, status: true },
        });
        if (!inventory) throw new NotFoundException("Inventory count not found");
        if (inventory.status !== "draft") {
            throw new BadRequestException("Can only cancel draft inventories");
        }

        return this.prisma.inventoryCount.update({
            where: { id },
            data: { status: "canceled" },
        });
    }

    async remove(companyId: string, id: string) {
        const inventory = await this.prisma.inventoryCount.findFirst({
            where: { id, companyId },
            select: { id: true, status: true },
        });
        if (!inventory) throw new NotFoundException("Inventory count not found");
        if (inventory.status === "completed") {
            throw new BadRequestException("Cannot delete completed inventory");
        }

        await this.prisma.inventoryCount.delete({ where: { id } });
        return { ok: true };
    }
}
