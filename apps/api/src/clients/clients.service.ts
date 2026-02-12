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
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async getOne(companyId: string, id: string) {
        const client = await this.prisma.client.findFirst({
            where: { id, companyId },
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
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
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    notes: true,
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
}
