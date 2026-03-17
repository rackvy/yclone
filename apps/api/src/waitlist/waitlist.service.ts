import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWaitlistDto } from "./dto/create-waitlist.dto";
import { UpdateWaitlistDto } from "./dto/update-waitlist.dto";

@Injectable()
export class WaitlistService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string, branchId?: string, status?: string) {
        return this.prisma.waitlist.findMany({
            where: {
                companyId,
                ...(branchId && { branchId }),
                ...(status && { status }),
            },
            orderBy: { createdAt: "desc" },
            include: {
                client: { select: { id: true, fullName: true, phone: true } },
                service: { select: { id: true, name: true } },
                masterEmployee: { select: { id: true, fullName: true } },
                branch: { select: { id: true, name: true } },
            },
        });
    }

    async create(companyId: string, dto: CreateWaitlistDto) {
        // Проверяем branch
        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId },
            select: { id: true },
        });
        if (!branch) throw new BadRequestException("Branch not found");

        // Проверяем client
        const client = await this.prisma.client.findFirst({
            where: { id: dto.clientId, companyId },
            select: { id: true },
        });
        if (!client) throw new BadRequestException("Client not found");

        // Проверяем service если указан
        if (dto.serviceId) {
            const service = await this.prisma.service.findFirst({
                where: { id: dto.serviceId, companyId },
                select: { id: true },
            });
            if (!service) throw new BadRequestException("Service not found");
        }

        // Проверяем employee если указан
        if (dto.masterEmployeeId) {
            const employee = await this.prisma.employee.findFirst({
                where: { id: dto.masterEmployeeId, companyId },
                select: { id: true },
            });
            if (!employee) throw new BadRequestException("Employee not found");
        }

        return this.prisma.waitlist.create({
            data: {
                companyId,
                branchId: dto.branchId,
                clientId: dto.clientId,
                serviceId: dto.serviceId || null,
                masterEmployeeId: dto.masterEmployeeId || null,
                preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
                preferredTimeFrom: dto.preferredTimeFrom || null,
                preferredTimeTo: dto.preferredTimeTo || null,
                comment: dto.comment?.trim() || null,
            },
            include: {
                client: { select: { id: true, fullName: true, phone: true } },
                service: { select: { id: true, name: true } },
                masterEmployee: { select: { id: true, fullName: true } },
            },
        });
    }

    async update(companyId: string, id: string, dto: UpdateWaitlistDto) {
        const item = await this.prisma.waitlist.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!item) throw new NotFoundException("Waitlist item not found");

        const data: any = {};
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.comment !== undefined) data.comment = dto.comment?.trim() || null;

        return this.prisma.waitlist.update({
            where: { id },
            data,
            include: {
                client: { select: { id: true, fullName: true, phone: true } },
                service: { select: { id: true, name: true } },
                masterEmployee: { select: { id: true, fullName: true } },
            },
        });
    }

    async remove(companyId: string, id: string) {
        const item = await this.prisma.waitlist.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!item) throw new NotFoundException("Waitlist item not found");

        await this.prisma.waitlist.delete({ where: { id } });
        return { ok: true };
    }
}
