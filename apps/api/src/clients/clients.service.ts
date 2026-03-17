import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

function normalizePhone(phone: string): string {
    // MVP-нормализация: оставляем + и цифры, убираем пробелы/скобки/дефисы
    let p = phone.trim();
    p = p.replace(/[^\d+]/g, "");
    // если начинается с 8 и длина 11 — можно привести к +7
    if (/^8\d{10}$/.test(p)) p = "+7" + p.slice(1);
    // если 7XXXXXXXXXX без плюса
    if (/^7\d{10}$/.test(p)) p = "+7" + p.slice(1);
    return p;
}

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(companyId: string, q?: string, take = 50) {
        const query = q?.trim();
        const takeSafe = Math.min(Math.max(Number(take) || 50, 1), 200);

        if (!query) {
            return this.prisma.client.findMany({
                where: { companyId },
                orderBy: [{ createdAt: "desc" }],
                take: takeSafe,
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    notes: true,
                    birthDate: true,
                    discountPercent: true,
                    discountAppliesTo: true,
                    preferredMasterId: true,
                    preferredMaster: { select: { id: true, fullName: true } },
                    preferredServiceIds: true,
                    preferredProductIds: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }

        const phoneQ = normalizePhone(query);

        return this.prisma.client.findMany({
            where: {
                companyId,
                OR: [
                    { fullName: { contains: query, mode: "insensitive" } },
                    { phone: { contains: phoneQ } },
                    { email: { contains: query, mode: "insensitive" } },
                ],
            },
            orderBy: [{ createdAt: "desc" }],
            take: takeSafe,
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                notes: true,
                birthDate: true,
                discountPercent: true,
                discountAppliesTo: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async getOne(companyId: string, id: string) {
        const client = await this.prisma.client.findFirst({
            where: { id, companyId },
            include: {
                certificates: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" },
                },
                preferredMaster: { select: { id: true, fullName: true } },
            },
        });
        if (!client) throw new NotFoundException("Client not found");
        return client;
    }

    async create(companyId: string, dto: CreateClientDto) {
        const phone = normalizePhone(dto.phone);
        if (!phone) throw new BadRequestException("Invalid phone");

        try {
            return await this.prisma.client.create({
                data: {
                    companyId,
                    fullName: dto.fullName.trim(),
                    phone,
                    email: dto.email?.trim() || null,
                    notes: dto.notes?.trim() || null,
                    birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                    discountPercent: dto.discountPercent ?? 0,
                    discountAppliesTo: dto.discountAppliesTo ?? "all",
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    notes: true,
                    birthDate: true,
                    discountPercent: true,
                    discountAppliesTo: true,
                    preferredMasterId: true,
                    preferredMaster: { select: { id: true, fullName: true } },
                    preferredServiceIds: true,
                    preferredProductIds: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (e: any) {
            // уникальность [companyId, phone]
            if (typeof e?.code === "string" && e.code === "P2002") {
                throw new BadRequestException("Client with this phone already exists");
            }
            throw e;
        }
    }

    async update(companyId: string, id: string, dto: UpdateClientDto) {
        const exists = await this.prisma.client.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Client not found");

        const data: any = {};
        if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
        if (dto.phone !== undefined) data.phone = normalizePhone(dto.phone);
        if (dto.email !== undefined) data.email = dto.email?.trim() || null;
        if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
        if (dto.comment !== undefined) data.notes = dto.comment?.trim() || null;
        if (dto.birthDate !== undefined) data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
        if (dto.discountPercent !== undefined) data.discountPercent = dto.discountPercent;
        if (dto.discountAppliesTo !== undefined) data.discountAppliesTo = dto.discountAppliesTo;

        try {
            return await this.prisma.client.update({
                where: { id },
                data,
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    notes: true,
                    birthDate: true,
                    discountPercent: true,
                    discountAppliesTo: true,
                    preferredMasterId: true,
                    preferredMaster: { select: { id: true, fullName: true } },
                    preferredServiceIds: true,
                    preferredProductIds: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (e: any) {
            if (typeof e?.code === "string" && e.code === "P2002") {
                throw new BadRequestException("Client with this phone already exists");
            }
            throw e;
        }
    }

    async remove(companyId: string, id: string) {
        const exists = await this.prisma.client.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Client not found");

        // Если клиент привязан к записям — onDelete=SetNull в Appointment, так что удаление безопасно.
        await this.prisma.client.delete({ where: { id } });
        return { ok: true };
    }

    // ===== CERTIFICATES =====
    async addCertificate(companyId: string, clientId: string, dto: { name: string; amount: number; expiresAt?: string }) {
        const client = await this.prisma.client.findFirst({
            where: { id: clientId, companyId },
            select: { id: true },
        });
        if (!client) throw new NotFoundException("Client not found");

        return this.prisma.clientCertificate.create({
            data: {
                companyId,
                clientId,
                name: dto.name,
                amount: dto.amount,
                remaining: dto.amount,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
        });
    }

    async listCertificates(companyId: string, clientId: string) {
        const client = await this.prisma.client.findFirst({
            where: { id: clientId, companyId },
            select: { id: true },
        });
        if (!client) throw new NotFoundException("Client not found");

        return this.prisma.clientCertificate.findMany({
            where: { clientId, companyId },
            orderBy: { createdAt: "desc" },
        });
    }

    async updateCertificate(companyId: string, certId: string, dto: { remaining?: number; isActive?: boolean }) {
        const cert = await this.prisma.clientCertificate.findFirst({
            where: { id: certId, companyId },
            select: { id: true },
        });
        if (!cert) throw new NotFoundException("Certificate not found");

        return this.prisma.clientCertificate.update({
            where: { id: certId },
            data: dto,
        });
    }

    // ===== STATISTICS =====
    async getStats(companyId: string, clientId: string) {
        const client = await this.prisma.client.findFirst({
            where: { id: clientId, companyId },
            select: { id: true, createdAt: true },
        });
        if (!client) throw new NotFoundException("Client not found");

        // Получаем все завершённые записи клиента
        const appointments = await this.prisma.appointment.findMany({
            where: {
                companyId,
                clientId,
                status: "done",
                type: "service",
            },
            select: {
                id: true,
                total: true,
                startAt: true,
                masterEmployeeId: true,
                masterEmployee: { select: { id: true, fullName: true } },
                services: {
                    select: {
                        serviceId: true,
                        service: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { startAt: "desc" },
        });

        const visitsCount = appointments.length;
        const totalSpent = appointments.reduce((sum, a) => sum + a.total, 0);
        const avgCheck = visitsCount > 0 ? Math.round(totalSpent / visitsCount) : 0;

        // Первый и последний визит
        const firstVisit = appointments.length > 0 ? appointments[appointments.length - 1].startAt : null;
        const lastVisit = appointments.length > 0 ? appointments[0].startAt : null;

        // Частота визитов (в месяц)
        let visitsPerMonth = 0;
        if (firstVisit && lastVisit && visitsCount > 1) {
            const monthsDiff = Math.max(1, 
                (new Date(lastVisit).getTime() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24 * 30)
            );
            visitsPerMonth = Math.round((visitsCount / monthsDiff) * 10) / 10;
        } else if (visitsCount === 1) {
            visitsPerMonth = 1;
        }

        // Предпочитаемый мастер
        const masterCounts = new Map<string, { count: number; name: string; id: string }>();
        for (const a of appointments) {
            const key = a.masterEmployeeId;
            const existing = masterCounts.get(key);
            if (existing) {
                existing.count++;
            } else {
                masterCounts.set(key, {
                    count: 1,
                    name: a.masterEmployee?.fullName || "Неизвестный",
                    id: key,
                });
            }
        }
        const preferredMaster = [...masterCounts.values()]
            .sort((a, b) => b.count - a.count)[0] || null;

        // Предпочитаемые услуги (топ-3)
        const serviceCounts = new Map<string, { count: number; name: string; id: string }>();
        for (const a of appointments) {
            for (const s of a.services) {
                const key = s.serviceId;
                const existing = serviceCounts.get(key);
                if (existing) {
                    existing.count++;
                } else {
                    serviceCounts.set(key, {
                        count: 1,
                        name: s.service?.name || "Услуга",
                        id: key,
                    });
                }
            }
        }
        const topServices = [...serviceCounts.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return {
            visitsCount,
            totalSpent,
            avgCheck,
            visitsPerMonth,
            firstVisit,
            lastVisit,
            preferredMaster,
            topServices,
        };
    }

    // Обновить предпочтения клиента (вызывается при завершении записи)
    async updateClientPreferences(clientId: string) {
        // Получаем все завершённые записи клиента с мастерами и услугами
        const appointments = await this.prisma.appointment.findMany({
            where: {
                clientId,
                status: "done",
            },
            select: {
                masterEmployeeId: true,
                services: { select: { serviceId: true } },
                products: { select: { productId: true } },
            },
        });

        if (appointments.length === 0) return;

        // Считаем какого мастера чаще посещают
        const masterCounts = new Map<string, number>();
        for (const a of appointments) {
            const count = masterCounts.get(a.masterEmployeeId) || 0;
            masterCounts.set(a.masterEmployeeId, count + 1);
        }

        // Находим мастера с максимальным количеством визитов
        let maxCount = 0;
        let preferredMasterId: string | null = null;
        for (const [masterId, count] of masterCounts) {
            if (count > maxCount) {
                maxCount = count;
                preferredMasterId = masterId;
            }
        }

        // Считаем какие услуги чаще выбирают
        const serviceCounts = new Map<string, number>();
        for (const a of appointments) {
            for (const s of a.services) {
                const count = serviceCounts.get(s.serviceId) || 0;
                serviceCounts.set(s.serviceId, count + 1);
            }
        }
        const preferredServiceIds = [...serviceCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);

        // Считаем какие товары чаще покупают
        const productCounts = new Map<string, number>();
        for (const a of appointments) {
            for (const p of a.products) {
                const count = productCounts.get(p.productId) || 0;
                productCounts.set(p.productId, count + 1);
            }
        }
        const preferredProductIds = [...productCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);

        // Обновляем клиента
        await this.prisma.client.update({
            where: { id: clientId },
            data: {
                ...(preferredMasterId ? { preferredMasterId } : {}),
                preferredServiceIds: JSON.stringify(preferredServiceIds),
                preferredProductIds: JSON.stringify(preferredProductIds),
            },
        });
    }
}
