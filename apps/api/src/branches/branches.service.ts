import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string) {
        return this.prisma.branch.findMany({
            where: { companyId },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                name: true,
                address: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async create(companyId: string, dto: CreateBranchDto) {
        return this.prisma.branch.create({
            data: {
                companyId,
                name: dto.name,
                address: dto.address ?? null,
            },
            select: {
                id: true,
                name: true,
                address: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async update(companyId: string, branchId: string, dto: UpdateBranchDto) {
        const branch = await this.prisma.branch.findFirst({
            where: { id: branchId, companyId },
            select: { id: true },
        });
        if (!branch) throw new NotFoundException("Branch not found");

        return this.prisma.branch.update({
            where: { id: branchId },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.address !== undefined ? { address: dto.address } : {}),
            },
            select: {
                id: true,
                name: true,
                address: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(companyId: string, branchId: string) {
        // Нельзя удалять последний филиал — иначе система сломается
        const count = await this.prisma.branch.count({ where: { companyId } });
        if (count <= 1) throw new BadRequestException("Cannot delete the last branch");

        const branch = await this.prisma.branch.findFirst({
            where: { id: branchId, companyId },
            select: { id: true },
        });
        if (!branch) throw new NotFoundException("Branch not found");

        await this.prisma.branch.delete({ where: { id: branchId } });
        return { ok: true };
    }
}
