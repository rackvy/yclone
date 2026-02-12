import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";

@Injectable()
export class ProductCategoriesService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string) {
        return this.prisma.productCategory.findMany({
            where: { companyId },
            orderBy: [{ sort: "asc" }],
            select: { id: true, name: true, sort: true },
        });
    }

    async getOne(companyId: string, id: string) {
        const cat = await this.prisma.productCategory.findFirst({
            where: { id, companyId },
            select: { id: true, name: true, sort: true },
        });
        if (!cat) throw new NotFoundException("Product category not found");
        return cat;
    }

    async create(companyId: string, dto: CreateProductCategoryDto) {
        try {
            return await this.prisma.productCategory.create({
                data: { companyId, name: dto.name.trim(), sort: dto.sort ?? 100 },
                select: { id: true, name: true, sort: true },
            });
        } catch (e: any) {
            if (typeof e?.code === "string" && e.code === "P2002") {
                throw new BadRequestException("Category with this name already exists");
            }
            throw e;
        }
    }

    async update(companyId: string, id: string, dto: UpdateProductCategoryDto) {
        const exists = await this.prisma.productCategory.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Product category not found");

        try {
            return await this.prisma.productCategory.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                    ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
                },
                select: { id: true, name: true, sort: true },
            });
        } catch (e: any) {
            if (typeof e?.code === "string" && e.code === "P2002") {
                throw new BadRequestException("Category with this name already exists");
            }
            throw e;
        }
    }

    async remove(companyId: string, id: string) {
        const exists = await this.prisma.productCategory.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Product category not found");

        // category on Product стоит SetNull => безопасно
        await this.prisma.productCategory.delete({ where: { id } });
        return { ok: true };
    }
}
