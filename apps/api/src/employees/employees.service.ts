import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEmployeeDto, EmployeeRoleDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string, branchId?: string) {
        return this.prisma.employee.findMany({
            where: {
                companyId,
                ...(branchId ? { branchId } : {}),
            },
            orderBy: [{ createdAt: "asc" }],
            select: {
                id: true,
                fullName: true,
                role: true,
                status: true,
                phone: true,
                email: true,
                avatarKey: true,
                branchId: true,
                masterRankId: true,
                createdAt: true,
                updatedAt: true,
                branch: { select: { id: true, name: true } },
                masterRank: { select: { id: true, name: true } },
                services: {
                    select: {
                        serviceId: true,
                        service: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }

    async get(companyId: string, id: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id, companyId },
            select: {
                id: true,
                fullName: true,
                role: true,
                status: true,
                phone: true,
                email: true,
                avatarKey: true,
                branchId: true,
                masterRankId: true,
                createdAt: true,
                updatedAt: true,
                branch: { select: { id: true, name: true } },
                masterRank: { select: { id: true, name: true } },
                services: {
                    select: {
                        serviceId: true,
                        service: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!emp) throw new NotFoundException("Employee not found");
        return emp;
    }

    private async assertBranchInCompany(companyId: string, branchId: string) {
        const branch = await this.prisma.branch.findFirst({
            where: { id: branchId, companyId },
            select: { id: true },
        });
        if (!branch) throw new BadRequestException("Branch does not belong to your company");
    }

    private async assertRankInCompany(companyId: string, rankId: string) {
        const rank = await this.prisma.masterRank.findFirst({
            where: { id: rankId, companyId },
            select: { id: true },
        });
        if (!rank) throw new BadRequestException("Master rank does not belong to your company");
    }

    private normalizeRole(role: EmployeeRoleDto) {
        // Prisma enum EmployeeRole совпадает по строкам с dto (admin/manager/master)
        return role;
    }

    async create(companyId: string, dto: CreateEmployeeDto) {
        await this.assertBranchInCompany(companyId, dto.branchId);

        if (dto.role !== EmployeeRoleDto.master && dto.masterRankId) {
            throw new BadRequestException("masterRankId is allowed only for role=master");
        }

        if (dto.role === EmployeeRoleDto.master && dto.masterRankId) {
            await this.assertRankInCompany(companyId, dto.masterRankId);
        }

        return this.prisma.employee.create({
            data: {
                companyId,
                branchId: dto.branchId,
                role: this.normalizeRole(dto.role) as any,
                fullName: dto.fullName,
                phone: dto.phone ?? null,
                email: dto.email ?? null,
                avatarKey: dto.avatarKey ?? null,
                masterRankId: dto.role === EmployeeRoleDto.master ? (dto.masterRankId ?? null) : null,
            },
            select: {
                id: true,
                fullName: true,
                role: true,
                phone: true,
                email: true,
                avatarKey: true,
                branchId: true,
                masterRankId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async update(companyId: string, id: string, dto: UpdateEmployeeDto) {
        const emp = await this.prisma.employee.findFirst({
            where: { id, companyId },
            select: { id: true, role: true },
        });
        if (!emp) throw new NotFoundException("Employee not found");

        if (dto.branchId) {
            await this.assertBranchInCompany(companyId, dto.branchId);
        }

        const nextRole = dto.role ?? (emp.role as any as EmployeeRoleDto);

        if (nextRole !== EmployeeRoleDto.master && dto.masterRankId) {
            throw new BadRequestException("masterRankId is allowed only for role=master");
        }

        if (nextRole === EmployeeRoleDto.master && dto.masterRankId) {
            await this.assertRankInCompany(companyId, dto.masterRankId);
        }

        return this.prisma.employee.update({
            where: { id },
            data: {
                ...(dto.fullName ? { fullName: dto.fullName } : {}),
                ...(dto.branchId ? { branchId: dto.branchId } : {}),
                ...(dto.role ? { role: this.normalizeRole(dto.role) as any } : {}),
                ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
                ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
                ...(dto.avatarKey !== undefined ? { avatarKey: dto.avatarKey ?? null } : {}),
                ...(dto.userId !== undefined ? { userId: dto.userId ?? null } : {}),
                ...(dto.masterRankId !== undefined
                    ? {
                        masterRankId:
                            nextRole === EmployeeRoleDto.master ? (dto.masterRankId ?? null) : null,
                    }
                    : {}),
            },
            select: {
                id: true,
                fullName: true,
                role: true,
                phone: true,
                email: true,
                avatarKey: true,
                branchId: true,
                masterRankId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(companyId: string, id: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!emp) throw new NotFoundException("Employee not found");

        // позже можно запретить удаление, если есть записи
        await this.prisma.employee.delete({ where: { id } });
        return { ok: true };
    }

    async terminate(companyId: string, id: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id, companyId },
            select: { id: true, userId: true },
        });
        if (!emp) throw new NotFoundException("Employee not found");

        // Soft delete - меняем статус на terminated и отключаем пользователя
        await this.prisma.$transaction(async (tx) => {
            // Меняем статус сотрудника
            await tx.employee.update({
                where: { id },
                data: { status: 'terminated' },
            });

            // Отключаем связанного пользователя если есть
            if (emp.userId) {
                await tx.user.update({
                    where: { id: emp.userId },
                    data: { status: 'disabled' },
                });
            }
        });

        return { ok: true };
    }

    async reactivate(companyId: string, id: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id, companyId },
            select: { id: true, userId: true },
        });
        if (!emp) throw new NotFoundException("Employee not found");

        await this.prisma.$transaction(async (tx) => {
            await tx.employee.update({
                where: { id },
                data: { status: 'active' },
            });

            if (emp.userId) {
                await tx.user.update({
                    where: { id: emp.userId },
                    data: { status: 'active' },
                });
            }
        });

        return { ok: true };
    }

    async getServices(companyId: string, employeeId: string) {
        await this.assertEmployee(companyId, employeeId);

        const services = await this.prisma.employeeService.findMany({
            where: { employeeId },
            select: {
                serviceId: true,
                service: {
                    select: {
                        id: true,
                        name: true,
                        durationMin: true,
                        category: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return services.map(s => s.service);
    }

    async addService(companyId: string, employeeId: string, serviceId: string) {
        await this.assertEmployee(companyId, employeeId);

        // Проверяем что услуга принадлежит компании
        const service = await this.prisma.service.findFirst({
            where: { id: serviceId, companyId },
            select: { id: true },
        });
        if (!service) throw new NotFoundException("Service not found");

        try {
            await this.prisma.employeeService.create({
                data: { employeeId, serviceId },
            });
        } catch (e) {
            // Игнорируем ошибку дубликата
        }

        return { ok: true };
    }

    async removeService(companyId: string, employeeId: string, serviceId: string) {
        await this.assertEmployee(companyId, employeeId);

        await this.prisma.employeeService.deleteMany({
            where: { employeeId, serviceId },
        });

        return { ok: true };
    }

    private async assertEmployee(companyId: string, employeeId: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true },
        });
        if (!emp) throw new NotFoundException("Employee not found");
    }
}
