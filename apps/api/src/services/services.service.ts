import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

function assertDurationStep15(durationMin: number) {
    if (durationMin % 15 !== 0) {
        throw new BadRequestException("durationMin must be a multiple of 15");
    }
}

@Injectable()
export class ServicesService {
    constructor(private readonly prisma: PrismaService) {}

    private async assertRanksInCompany(companyId: string, rankIds: string[]) {
        if (rankIds.length === 0) return;

        const found = await this.prisma.masterRank.findMany({
            where: { companyId, id: { in: rankIds } },
            select: { id: true },
        });

        if (found.length !== rankIds.length) {
            throw new BadRequestException("Some masterRankId do not belong to your company");
        }
    }

    private async assertCategoryInCompany(companyId: string, categoryId: string) {
        const cat = await this.prisma.serviceCategory.findFirst({
            where: { id: categoryId, companyId },
            select: { id: true },
        });
        if (!cat) throw new BadRequestException("Service category does not belong to your company");
    }


    async list(companyId: string, categoryId?: string) {
        return this.prisma.service.findMany({
            where: {
                companyId,
                ...(categoryId ? { categoryId } : {}),
            },
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                name: true,
                durationMin: true,
                sort: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                pricesByRank: {
                    select: {
                        id: true,
                        masterRankId: true,
                        price: true,
                        masterRank: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });
    }

    async getOne(companyId: string, id: string) {
        const service = await this.prisma.service.findFirst({
            where: { id, companyId },
            select: {
                id: true,
                name: true,
                durationMin: true,
                sort: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                pricesByRank: {
                    select: {
                        id: true,
                        masterRankId: true,
                        price: true,
                        masterRank: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!service) throw new NotFoundException("Service not found");
        return service;
    }

    async create(companyId: string, dto: CreateServiceDto) {
        assertDurationStep15(dto.durationMin);

        if (dto.categoryId) {
            await this.assertCategoryInCompany(companyId, dto.categoryId);
        }

        const prices = dto.pricesByRank ?? [];
        await this.assertRanksInCompany(companyId, prices.map((p) => p.masterRankId));

        // создаём услугу + цены в транзакции
        return this.prisma.$transaction(async (tx) => {
            const service = await tx.service.create({
                data: {
                    companyId,
                    name: dto.name,
                    durationMin: dto.durationMin,
                    categoryId: dto.categoryId ?? null,
                    sort: dto.sort ?? 100,
                    isActive: dto.isActive ?? true,
                },
                select: {
                    id: true,
                    name: true,
                    durationMin: true,
                    sort: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (prices.length > 0) {
                // создаём цены
                await tx.servicePriceByRank.createMany({
                    data: prices.map((p) => ({
                        serviceId: service.id,
                        masterRankId: p.masterRankId,
                        price: p.price,
                    })),
                });
            }

            // возвращаем вместе с ценами
            return tx.service.findUnique({
                where: { id: service.id },
                select: {
                    id: true,
                    name: true,
                    durationMin: true,
                    sort: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    pricesByRank: {
                        select: {
                            id: true,
                            masterRankId: true,
                            price: true,
                            masterRank: { select: { id: true, name: true } },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
            });
        });
    }

    async update(companyId: string, id: string, dto: UpdateServiceDto) {
        if (dto.durationMin !== undefined) {
            assertDurationStep15(dto.durationMin);
        }

        if (dto.categoryId !== undefined && dto.categoryId !== null) {
            await this.assertCategoryInCompany(companyId, dto.categoryId);
        }

        const exists = await this.prisma.service.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Service not found");

        const pricesProvided = dto.pricesByRank !== undefined;
        const prices = dto.pricesByRank ?? [];

        if (pricesProvided) {
            await this.assertRanksInCompany(companyId, prices.map((p) => p.masterRankId));
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.service.update({
                where: { id },
                data: {
                    ...(dto.name ? { name: dto.name } : {}),
                    ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
                    ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
                    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
                    ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
                },
            });

            if (pricesProvided) {
                // Полная замена цен:
                await tx.servicePriceByRank.deleteMany({ where: { serviceId: id } });

                if (prices.length > 0) {
                    await tx.servicePriceByRank.createMany({
                        data: prices.map((p) => ({
                            serviceId: id,
                            masterRankId: p.masterRankId,
                            price: p.price,
                        })),
                    });
                }
            }

            return tx.service.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    durationMin: true,
                    sort: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    pricesByRank: {
                        select: {
                            id: true,
                            masterRankId: true,
                            price: true,
                            masterRank: { select: { id: true, name: true } },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
            });
        });
    }

    async remove(companyId: string, id: string) {
        const exists = await this.prisma.service.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException("Service not found");

        // если потом появятся appointments — здесь можно запретить удаление
        await this.prisma.$transaction(async (tx) => {
            await tx.servicePriceByRank.deleteMany({ where: { serviceId: id } });
            await tx.service.delete({ where: { id } });
        });

        return { ok: true };
    }

    // Услуги + цена для выбранного ранга (для UI записи)
    async listForRank(companyId: string, masterRankId: string) {
        // ранг должен быть твоей компании
        const rank = await this.prisma.masterRank.findFirst({
            where: { id: masterRankId, companyId },
            select: { id: true },
        });
        if (!rank) throw new BadRequestException("Master rank does not belong to your company");

        const services = await this.prisma.service.findMany({
            where: { companyId, isActive: true },
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                name: true,
                durationMin: true,
                sort: true,
                isActive: true,
                pricesByRank: {
                    where: { masterRankId },
                    select: { price: true },
                },
            },
        });

        // приводим к удобному формату: price = number | null
        return services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMin: s.durationMin,
            price: s.pricesByRank[0]?.price ?? null,
        }));
    }
}
