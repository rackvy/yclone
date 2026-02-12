import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";

@Injectable()
export class ServiceCategoriesService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string) {
        return this.prisma.serviceCategory.findMany({
            where: { companyId },
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                name: true,
                sort: true,
            },
        });
    }

    async getOne(companyId: string, id: string) {
        const cat = await this.prisma.serviceCategory.findFirst({
            where: { id, companyId },
            select: { id: true, name: true, sort: true },
        });
        if (!cat) throw new NotFoundException("Service category not found");
        return cat;
    }

    async create(companyId: string, dto: CreateServiceCategoryDto) {
        try {
            return await this.prisma.serviceCategory.create({
                data: {
                    companyId,
                    name: dto.name.trim(),
                    sort: dto.sort ?? 100,
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

    async update(companyId: string, id: string, dto: UpdateServiceCategoryDto) {
        const exists = await this.prisma.serviceCategory.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Service category not found");

        try {
            return await this.prisma.serviceCategory.update({
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
        const exists = await this.prisma.serviceCategory.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Service category not found");

        // Category on Service стоит SetNull, поэтому удаление безопасно
        await this.prisma.serviceCategory.delete({ where: { id } });
        return { ok: true };
    }
}
