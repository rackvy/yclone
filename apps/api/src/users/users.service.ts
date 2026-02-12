import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async create(companyId: string, dto: CreateUserDto) {
        // Проверяем уникальность email в рамках компании
        const existing = await this.prisma.user.findUnique({
            where: { companyId_email: { companyId, email: dto.email } },
        });

        if (existing) {
            throw new ConflictException("User with this email already exists");
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        return this.prisma.user.create({
            data: {
                email: dto.email,
                phone: dto.phone,
                passwordHash,
                companyId,
            },
            select: {
                id: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async list(companyId: string) {
        return this.prisma.user.findMany({
            where: { companyId },
            select: {
                id: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async updateProfile(userId: string, companyId: string, dto: { email?: string; phone?: string }) {
        // Если меняем email, проверяем уникальность
        if (dto.email) {
            const existing = await this.prisma.user.findUnique({
                where: { companyId_email: { companyId, email: dto.email } },
            });
            if (existing && existing.id !== userId) {
                throw new ConflictException("User with this email already exists");
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.email && { email: dto.email }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
            },
            select: {
                id: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        // Проверяем текущий пароль
        const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!isValid) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        // Хешируем новый пароль
        const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });

        return { success: true };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                status: true,
                companyId: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                // Получаем роль из связанного сотрудника
                employee: {
                    select: {
                        id: true,
                        role: true,
                        fullName: true,
                    },
                },
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        // Определяем роль для отображения
        const role = user.employee ? user.employee.role : 'owner';

        return {
            ...user,
            role,
        };
    }
}
