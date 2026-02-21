import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) {}

    private async assertBranch(companyId: string, branchId: string) {
        const b = await this.prisma.branch.findFirst({
            where: { id: branchId, companyId },
            select: { id: true },
        });
        if (!b) throw new BadRequestException("Branch does not belong to your company");
    }

    private async assertCategory(companyId: string, categoryId: string) {
        const cat = await this.prisma.productCategory.findFirst({
            where: { id: categoryId, companyId },
            select: { id: true },
        });
        if (!cat) throw new BadRequestException("Product category does not belong to your company");
    }

    async list(companyId: string, params: { branchId: string; categoryId?: string; q?: string }) {
        await this.assertBranch(companyId, params.branchId);

        const q = params.q?.trim();
        return this.prisma.product.findMany({
            where: {
                companyId,
                branchId: params.branchId,
                ...(params.categoryId ? { categoryId: params.categoryId } : {}),
                ...(q
                    ? {
                        OR: [
                            { name: { contains: q, mode: "insensitive" } },
                            { sku: { contains: q, mode: "insensitive" } },
                            { barcode: { contains: q, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            orderBy: [{ createdAt: "desc" }],
            select: {
                id: true,
                branchId: true,
                categoryId: true,
                name: true,
                sku: true,
                barcode: true,
                price: true,
                stockQty: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                category: { select: { id: true, name: true } },
            },
        });
    }

    async getOne(companyId: string, id: string) {
        const p = await this.prisma.product.findFirst({
            where: { id, companyId },
            select: {
                id: true,
                companyId: true,
                branchId: true,
                categoryId: true,
                name: true,
                sku: true,
                barcode: true,
                price: true,
                stockQty: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                category: { select: { id: true, name: true } },
            },
        });
        if (!p) throw new NotFoundException("Product not found");
        return p;
    }

    async create(companyId: string, dto: CreateProductDto) {
        await this.assertBranch(companyId, dto.branchId);
        if (dto.categoryId) await this.assertCategory(companyId, dto.categoryId);

        try {
            return await this.prisma.product.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    categoryId: dto.categoryId ?? null,
                    name: dto.name.trim(),
                    sku: dto.sku?.trim() || null,
                    barcode: dto.barcode?.trim() || null,
                    price: dto.price,
                    stockQty: dto.stockQty ?? 0,
                    isActive: dto.isActive ?? true,
                },
                select: {
                    id: true,
                    branchId: true,
                    categoryId: true,
                    name: true,
                    sku: true,
                    barcode: true,
                    price: true,
                    stockQty: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    category: { select: { id: true, name: true } },
                },
            });
        } catch (e: any) {
            if (typeof e?.code === "string" && e.code === "P2002") {
                throw new BadRequestException("SKU or barcode must be unique within branch");
            }
            throw e;
        }
    }

    async update(companyId: string, id: string, dto: UpdateProductDto) {
        const exists = await this.prisma.product.findFirst({
            where: { id, companyId },
            select: { id: true, branchId: true },
        });
        if (!exists) throw new NotFoundException("Product not found");

        if (dto.branchId !== undefined && dto.branchId !== exists.branchId) {
            await this.assertBranch(companyId, dto.branchId);
        }

        if (dto.categoryId !== undefined && dto.categoryId !== null) {
            await this.assertCategory(companyId, dto.categoryId);
        }

        try {
            return await this.prisma.product.update({
                where: { id },
                data: {
                    ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
                    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                    ...(dto.price !== undefined ? { price: dto.price } : {}),
                    ...(dto.stockQty !== undefined ? { stockQty: dto.stockQty } : {}),
                    ...(dto.sku !== undefined ? { sku: dto.sku ? dto.sku.trim() : null } : {}),
                    ...(dto.barcode !== undefined ? { barcode: dto.barcode ? dto.barcode.trim() : null } : {}),
                    ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
                    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
                },
                select: {
                    id: true,
                    branchId: true,
                    categoryId: true,
                    name: true,
                    sku: true,
                    barcode: true,
                    price: true,
                    stockQty: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    category: { select: { id: true, name: true } },
                },
            });
        } catch (e: any) {
            if (typeof e?.code === "string" && e.code === "P2002") {
                throw new BadRequestException("SKU or barcode must be unique within branch");
            }
            throw e;
        }
    }

    async remove(companyId: string, id: string) {
        const exists = await this.prisma.product.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Product not found");

        await this.prisma.product.delete({ where: { id } });
        return { ok: true };
    }
}
