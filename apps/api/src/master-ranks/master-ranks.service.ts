import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMasterRankDto } from "./dto/create-master-rank.dto";
import { UpdateMasterRankDto } from "./dto/update-master-rank.dto";

@Injectable()
export class MasterRanksService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string) {
        return this.prisma.masterRank.findMany({
            where: { companyId },
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                name: true,
                sort: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async create(companyId: string, dto: CreateMasterRankDto) {
        return this.prisma.masterRank.create({
            data: {
                companyId,
                name: dto.name,
                sort: dto.sort ?? 100,
                isActive: dto.isActive ?? true,
            },
            select: {
                id: true,
                name: true,
                sort: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async update(companyId: string, id: string, dto: UpdateMasterRankDto) {
        const rank = await this.prisma.masterRank.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!rank) throw new NotFoundException("Master rank not found");

        return this.prisma.masterRank.update({
            where: { id },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
            select: {
                id: true,
                name: true,
                sort: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(companyId: string, id: string) {
        const rank = await this.prisma.masterRank.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!rank) throw new NotFoundException("Master rank not found");

        // Нельзя удалить ранг, если к нему привязаны сотрудники
        const used = await this.prisma.employee.count({ where: { companyId, masterRankId: id } });
        if (used > 0) throw new BadRequestException("Cannot delete master rank: it is used by employees");

        await this.prisma.masterRank.delete({ where: { id } });
        return { ok: true };
    }
}
