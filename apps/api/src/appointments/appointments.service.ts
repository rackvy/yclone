import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function parseDateYYYYMMDD(s: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new BadRequestException("Invalid date format. Use YYYY-MM-DD");
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d, 0, 0, 0));
    if (Number.isNaN(dt.getTime())) throw new BadRequestException("Invalid date");
    return dt;
}
function isHHMM(s: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
function hhmmToMin(s: string): number {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
}
function assertStep15(min: number) {
    if (min % 15 !== 0) throw new BadRequestException("Time must be multiple of 15 minutes");
}
function addMinutes(dateUTC: Date, minutes: number): Date {
    return new Date(dateUTC.getTime() + minutes * 60000);
}

@Injectable()
export class AppointmentsService {
    constructor(private readonly prisma: PrismaService) {}

    private async assertBranch(companyId: string, branchId: string) {
        const b = await this.prisma.branch.findFirst({
            where: { id: branchId, companyId },
            select: { id: true },
        });
        if (!b) throw new BadRequestException("Branch does not belong to your company");
    }

    private async assertEmployee(companyId: string, employeeId: string) {
        const e = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true, masterRankId: true },
        });
        if (!e) throw new BadRequestException("Employee does not belong to your company");
        return e;
    }

    private async recalcTotals(tx: PrismaService, appointmentId: string) {
        // сумма услуг
        const servicesSum = await tx.appointmentService.aggregate({
            where: { appointmentId },
            _sum: { price: true },
        });

        // сумма товаров
        const productsSum = await tx.appointmentProduct.aggregate({
            where: { appointmentId },
            _sum: { total: true },
        });

        const totalServices = servicesSum._sum.price ?? 0;
        const totalProducts = productsSum._sum.total ?? 0;
        const total = totalServices + totalProducts;

        await tx.appointment.update({
            where: { id: appointmentId },
            data: { totalServices, totalProducts, total },
        });

        return { totalServices, totalProducts, total };
    }

    private async assertClient(companyId: string, clientId: string) {
        const c = await this.prisma.client.findFirst({
            where: { id: clientId, companyId },
            select: { id: true },
        });
        if (!c) throw new BadRequestException("Client does not belong to your company");
    }

    private async ensureNoOverlap(companyId: string, masterEmployeeId: string, startAt: Date, endAt: Date) {
        const overlap = await this.prisma.appointment.findFirst({
            where: {
                companyId,
                masterEmployeeId,
                startAt: { lt: endAt },
                endAt: { gt: startAt },
                status: { notIn: ["canceled"] }, // canceled не блокирует время
            },
            select: { id: true },
        });
        if (overlap) throw new BadRequestException("Time slot is already taken");
    }

    private async buildServiceItems(companyId: string, masterEmployeeId: string, serviceIds: string[]) {
        const emp = await this.assertEmployee(companyId, masterEmployeeId);

        if (!emp.masterRankId) {
            throw new BadRequestException("Master employee must have masterRankId to book services");
        }

        const services = await this.prisma.service.findMany({
            where: { companyId, id: { in: serviceIds }, isActive: true },
            select: { id: true, durationMin: true, name: true },
        });

        if (services.length !== serviceIds.length) {
            throw new BadRequestException("Some services not found or inactive");
        }

        // цены по рангу
        const prices = await this.prisma.servicePriceByRank.findMany({
            where: {
                serviceId: { in: serviceIds },
                masterRankId: emp.masterRankId,
            },
            select: { serviceId: true, price: true },
        });

        const priceByService = new Map(prices.map((p) => [p.serviceId, p.price]));

        // Собираем items в порядке serviceIds
        const serviceById = new Map(services.map((s) => [s.id, s]));
        const items = serviceIds.map((id) => {
            const s = serviceById.get(id)!;
            const price = priceByService.get(id);
            if (price === undefined) {
                throw new BadRequestException(`No price for service ${id} at this master rank`);
            }
            return { serviceId: id, durationMin: s.durationMin, price };
        });

        return items;
    }

    private assertStatusTransition(from: string, to: string) {
        const allowed: Record<string, string[]> = {
            new: ["confirmed", "canceled"],
            confirmed: ["waiting", "done", "canceled"],
            waiting: ["done", "no_show", "canceled"],
            done: [],
            no_show: [],
            canceled: ["new"],
        };

        if (!allowed[from]?.includes(to)) {
            throw new BadRequestException(`Cannot change status from ${from} to ${to}`);
        }
    }


    async create(companyId: string, dto: any) {
        await this.assertBranch(companyId, dto.branchId);
        await this.assertEmployee(companyId, dto.masterEmployeeId);

        if (dto.clientId) await this.assertClient(companyId, dto.clientId);

        if (!isHHMM(dto.startTime)) throw new BadRequestException("startTime must be HH:MM");
        const dateUTC00 = parseDateYYYYMMDD(dto.date);
        const startMin = hhmmToMin(dto.startTime);
        assertStep15(startMin);

        const startAt = addMinutes(dateUTC00, startMin);

        if (dto.type === "block") {
            const blockDur = dto.blockDurationMin ?? 30;
            if (blockDur < 15) throw new BadRequestException("blockDurationMin must be >= 15");
            assertStep15(blockDur);

            const endAt = addMinutes(startAt, blockDur);

            await this.ensureNoOverlap(companyId, dto.masterEmployeeId, startAt, endAt);

            return this.prisma.appointment.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    type: "block",
                    status: "confirmed", // блок сразу подтверждаем
                    masterEmployeeId: dto.masterEmployeeId,
                    clientId: null, // блок без клиента
                    title: dto.title ?? "Занят",
                    comment: dto.comment ?? null,
                    startAt,
                    endAt,
                    isPaid: false,
                    totalServices: 0,
                    totalProducts: 0,
                    total: 0,
                },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    title: true,
                    comment: true,
                    startAt: true,
                    endAt: true,
                    masterEmployeeId: true,
                    branchId: true,
                },
            });
        }

        // type=service
        const serviceIds: string[] = (dto.services ?? []).map((x: any) => x.serviceId);
        if (serviceIds.length === 0) throw new BadRequestException("services is required for type=service");

        const items = await this.buildServiceItems(companyId, dto.masterEmployeeId, serviceIds);

        const totalDuration = items.reduce((sum, it) => sum + it.durationMin, 0);
        assertStep15(totalDuration);

        const endAt = addMinutes(startAt, totalDuration);

        await this.ensureNoOverlap(companyId, dto.masterEmployeeId, startAt, endAt);

        const isPaid = dto.isPaid ?? false;
        const totalServices = items.reduce((sum, it) => sum + it.price, 0);

        return this.prisma.$transaction(async (tx) => {
            const appt = await tx.appointment.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    type: "service",
                    status: "new",
                    masterEmployeeId: dto.masterEmployeeId,
                    clientId: dto.clientId ?? null,
                    title: null,
                    comment: dto.comment ?? null,
                    startAt,
                    endAt,
                    isPaid,
                    totalServices,
                    totalProducts: 0,
                    total: totalServices,
                },
                select: {
                    id: true,
                    companyId: true,
                    branchId: true,
                    type: true,
                    status: true,
                    masterEmployeeId: true,
                    clientId: true,
                    startAt: true,
                    endAt: true,
                    isPaid: true,
                    totalServices: true,
                    totalProducts: true,
                    total: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            await tx.appointmentService.createMany({
                data: items.map((it, idx) => ({
                    appointmentId: appt.id,
                    serviceId: it.serviceId,
                    durationMin: it.durationMin,
                    price: it.price,
                    sortOrder: 100 + idx,
                })),
            });

            const full = await tx.appointment.findUnique({
                where: { id: appt.id },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    masterEmployeeId: true,
                    clientId: true,
                    startAt: true,
                    endAt: true,
                    isPaid: true,
                    totalServices: true,
                    totalProducts: true,
                    total: true,
                    services: {
                        orderBy: { sortOrder: "asc" },
                        select: {
                            id: true,
                            serviceId: true,
                            durationMin: true,
                            price: true,
                            sortOrder: true,
                            service: { select: { id: true, name: true } },
                        },
                    },
                },
            });

            return full;
        });
    }

    async listDay(companyId: string, branchId: string, date: string) {
        await this.assertBranch(companyId, branchId);

        const dayStart = parseDateYYYYMMDD(date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        return this.prisma.appointment.findMany({
            where: {
                companyId,
                branchId,
                startAt: { lt: dayEnd },
                endAt: { gt: dayStart },
            },
            orderBy: [{ startAt: "asc" }],
            select: {
                id: true,
                type: true,
                status: true,
                paymentStatus: true,
                paidTotalKopeks: true,
                title: true,
                comment: true,
                startAt: true,
                endAt: true,
                isPaid: true,
                total: true,
                masterEmployeeId: true,
                masterEmployee: { select: { id: true, fullName: true } },
                clientId: true,
                client: { select: { id: true, fullName: true, phone: true } },
                services: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                        id: true,
                        durationMin: true,
                        price: true,
                        service: { select: { id: true, name: true } },
                    },
                },
                products: {
                    select: { id: true, qty: true, price: true, total: true, product: { select: { id: true, name: true } } },
                },
            },
        });
    }

    async cancel(companyId: string, id: string) {
        const appt = await this.prisma.appointment.findFirst({
            where: { id, companyId },
            select: { id: true, status: true },
        });
        if (!appt) throw new NotFoundException("Appointment not found");

        return this.prisma.appointment.update({
            where: { id },
            data: { status: "canceled" },
            select: { id: true, status: true },
        });
    }

    async listByClient(companyId: string, clientId: string) {
        return this.prisma.appointment.findMany({
            where: {
                companyId,
                clientId,
            },
            orderBy: [{ startAt: "desc" }],
            select: {
                id: true,
                type: true,
                status: true,
                title: true,
                comment: true,
                startAt: true,
                endAt: true,
                isPaid: true,
                total: true,
                masterEmployeeId: true,
                masterEmployee: { select: { id: true, fullName: true } },
                clientId: true,
                client: { select: { id: true, fullName: true, phone: true } },
                services: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                        id: true,
                        durationMin: true,
                        price: true,
                        service: { select: { id: true, name: true } },
                    },
                },
                products: {
                    select: {
                        id: true,
                        qty: true,
                        price: true,
                        total: true,
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });
    }

    async addProducts(
        companyId: string,
        appointmentId: string,
        dto: { items: { productId: string; qty: number }[]; createdByEmployeeId?: string; note?: string },
    ) {
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException("items is required");
        }

        if (dto.createdByEmployeeId) {
            await this.assertEmployee(companyId, dto.createdByEmployeeId);
        }

        // грузим запись
        const appt = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: {
                id: true,
                companyId: true,
                branchId: true,
                status: true,
                type: true,
                masterEmployeeId: true,
            },
        });

        if (!appt) throw new NotFoundException("Appointment not found");
        if (appt.status === "canceled") throw new BadRequestException("Appointment is canceled");

        // В блоки товары обычно не продают — но если хочешь запретить жестко:
        if (appt.type === "block") {
            throw new BadRequestException("Cannot add products to block appointment");
        }

        const productIds = dto.items.map((x) => x.productId);

        // грузим товары
        const products = await this.prisma.product.findMany({
            where: { companyId, id: { in: productIds }, isActive: true },
            select: { id: true, name: true, price: true, stockQty: true, branchId: true },
        });

        if (products.length !== productIds.length) {
            throw new BadRequestException("Some products not found or inactive");
        }

        // проверка: товары должны быть из того же филиала, что и запись
        for (const p of products) {
            if (p.branchId !== appt.branchId) {
                throw new BadRequestException("All products must belong to the same branch as appointment");
            }
        }

        // мапа productId -> product
        const pMap = new Map(products.map((p) => [p.id, p]));

        // нормализуем items (суммируем одинаковые productId)
        const qtyById = new Map<string, number>();
        for (const it of dto.items) {
            const qty = Number(it.qty);
            if (!Number.isFinite(qty) || qty < 1) throw new BadRequestException("qty must be >= 1");
            qtyById.set(it.productId, (qtyById.get(it.productId) ?? 0) + qty);
        }

        const uniqueItems = [...qtyById.entries()].map(([productId, qty]) => ({ productId, qty }));

        // Транзакция: create AppointmentProduct + StockMovement(sale) + decrement stock + recalc totals
        return this.prisma.$transaction(async (tx) => {
            // 1) проверяем остатки в транзакции (чтобы не было гонок)
            for (const it of uniqueItems) {
                const current = await tx.product.findUnique({
                    where: { id: it.productId },
                    select: { stockQty: true },
                });
                if (!current) throw new NotFoundException("Product not found");
                if (current.stockQty < it.qty) {
                    const p = pMap.get(it.productId)!;
                    throw new BadRequestException(`Not enough stock for "${p.name}"`);
                }
            }

            // 2) создаём AppointmentProduct (фиксируем price/total)
            const apProductsData = uniqueItems.map((it) => {
                const p = pMap.get(it.productId)!;
                const price = p.price;
                const total = price * it.qty;
                return {
                    appointmentId: appt.id,
                    productId: it.productId,
                    qty: it.qty,
                    price,
                    total,
                };
            });

            await tx.appointmentProduct.createMany({
                data: apProductsData,
            });

            // 3) создаём StockMovement sale + уменьшаем stockQty
            for (const it of uniqueItems) {
                await tx.stockMovement.create({
                    data: {
                        companyId,
                        branchId: appt.branchId,
                        productId: it.productId,
                        type: "sale",
                        qty: it.qty,
                        note: dto.note?.trim() || null,
                        appointmentId: appt.id,
                        createdByEmployeeId: dto.createdByEmployeeId ?? null,
                    },
                });

                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { decrement: it.qty } },
                });
            }

            // 4) пересчёт totals в appointment
            const totals = await this.recalcTotals(tx as any, appt.id);

            // 5) отдаём обновлённую запись (коротко + товары)
            const updated = await tx.appointment.findUnique({
                where: { id: appt.id },
                select: {
                    id: true,
                    status: true,
                    type: true,
                    branchId: true,
                    masterEmployeeId: true,
                    totalServices: true,
                    totalProducts: true,
                    total: true,
                    products: {
                        orderBy: { id: "asc" },
                        select: {
                            id: true,
                            qty: true,
                            price: true,
                            total: true,
                            product: { select: { id: true, name: true } },
                        },
                    },
                },
            });

            return { appointment: updated, totals };
        });
    }

    async book(
        companyId: string,
        dto: {
        branchId: string;
        masterEmployeeId: string;
        date: string;
        startTime: string;
        serviceIds: string[];
        clientId?: string;
        comment?: string;
        isPaid?: boolean;
    },
    ) {
        await this.assertBranch(companyId, dto.branchId);
        await this.assertEmployee(companyId, dto.masterEmployeeId);

        if (dto.clientId) {
            await this.assertClient(companyId, dto.clientId);
        }

        if (!dto.serviceIds || dto.serviceIds.length === 0) {
            throw new BadRequestException("serviceIds is required");
        }

        // парсинг времени (тот же код, что в create())
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dto.startTime)) {
            throw new BadRequestException("startTime must be HH:MM");
        }

        const dateUTC00 = (function parseDateYYYYMMDD(s: string): Date {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
            if (!m) throw new BadRequestException("Invalid date format. Use YYYY-MM-DD");
            const y = Number(m[1]);
            const mo = Number(m[2]) - 1;
            const d = Number(m[3]);
            const dt = new Date(Date.UTC(y, mo, d, 0, 0, 0));
            if (Number.isNaN(dt.getTime())) throw new BadRequestException("Invalid date");
            return dt;
        })(dto.date);

        const startMin = (function hhmmToMin(s: string): number {
            const [h, m] = s.split(":").map(Number);
            return h * 60 + m;
        })(dto.startTime);

        if (startMin % 15 !== 0) throw new BadRequestException("Time must be multiple of 15 minutes");

        const startAt = new Date(dateUTC00.getTime() + startMin * 60000);

        // Берём услуги + цены по рангу мастера (фиксируем итоговые items)
        const items = await this.buildServiceItems(companyId, dto.masterEmployeeId, dto.serviceIds);

        const totalDuration = items.reduce((sum, it: any) => sum + it.durationMin, 0);
        if (totalDuration % 15 !== 0) throw new BadRequestException("Total duration must be multiple of 15 minutes");

        const endAt = new Date(startAt.getTime() + totalDuration * 60000);

        // Проверка пересечений
        await this.ensureNoOverlap(companyId, dto.masterEmployeeId, startAt, endAt);

        const isPaid = dto.isPaid ?? false;
        const totalServices = items.reduce((sum: number, it: any) => sum + it.price, 0);

        // Создание в транзакции
        return this.prisma.$transaction(async (tx) => {
            const appt = await tx.appointment.create({
                data: {
                    companyId,
                    branchId: dto.branchId,
                    type: "service",
                    status: "new",
                    masterEmployeeId: dto.masterEmployeeId,
                    clientId: dto.clientId ?? null,
                    comment: dto.comment?.trim() || null,
                    startAt,
                    endAt,
                    isPaid,
                    totalServices,
                    totalProducts: 0,
                    total: totalServices,
                },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    branchId: true,
                    masterEmployeeId: true,
                    clientId: true,
                    startAt: true,
                    endAt: true,
                    isPaid: true,
                    totalServices: true,
                    totalProducts: true,
                    total: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            await tx.appointmentService.createMany({
                data: items.map((it: any, idx: number) => ({
                    appointmentId: appt.id,
                    serviceId: it.serviceId,
                    durationMin: it.durationMin,
                    price: it.price,
                    sortOrder: 100 + idx,
                })),
            });

            const full = await tx.appointment.findUnique({
                where: { id: appt.id },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    branchId: true,
                    masterEmployeeId: true,
                    clientId: true,
                    startAt: true,
                    endAt: true,
                    isPaid: true,
                    totalServices: true,
                    totalProducts: true,
                    total: true,
                    services: {
                        orderBy: { sortOrder: "asc" },
                        select: {
                            id: true,
                            durationMin: true,
                            price: true,
                            sortOrder: true,
                            service: { select: { id: true, name: true } },
                        },
                    },
                },
            });

            return full;
        });
    }
    async reschedule(
        companyId: string,
        appointmentId: string,
        dto: { date?: string; startTime?: string; serviceIds?: string[]; comment?: string },
    ) {
        // 1) грузим запись
        const appt = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: {
                id: true,
                companyId: true,
                branchId: true,
                type: true,
                status: true,
                masterEmployeeId: true,
                startAt: true,
                endAt: true,
            },
        });

        if (!appt) throw new NotFoundException("Appointment not found");
        if (appt.status === "canceled") throw new BadRequestException("Appointment is canceled");
        if (appt.type === "block") throw new BadRequestException("Cannot reschedule block appointment via this endpoint");

        const wantsChangeTime = dto.date !== undefined || dto.startTime !== undefined;
        const wantsChangeServices = dto.serviceIds !== undefined;

        if (!wantsChangeTime && !wantsChangeServices && dto.comment === undefined) {
            throw new BadRequestException("Nothing to update");
        }

        // 2) вычисляем новые startAt/endAt
        // базовая дата = текущий startAt (в UTC) -> YYYY-MM-DD
        const current = appt.startAt;
        const currentY = current.getUTCFullYear();
        const currentM = current.getUTCMonth() + 1;
        const currentD = current.getUTCDate();
        const currentDateStr =
            `${currentY}-` +
            `${String(currentM).padStart(2, "0")}-` +
            `${String(currentD).padStart(2, "0")}`;

        const dateStr = dto.date ?? currentDateStr;

        const parseDateYYYYMMDD = (s: string): Date => {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
            if (!m) throw new BadRequestException("Invalid date format. Use YYYY-MM-DD");
            const y = Number(m[1]);
            const mo = Number(m[2]) - 1;
            const d = Number(m[3]);
            const dt = new Date(Date.UTC(y, mo, d, 0, 0, 0));
            if (Number.isNaN(dt.getTime())) throw new BadRequestException("Invalid date");
            return dt;
        };

        const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
        const hhmmToMin = (s: string) => {
            const [h, m] = s.split(":").map(Number);
            return h * 60 + m;
        };

        const baseDateUTC00 = parseDateYYYYMMDD(dateStr);

        // текущий startTime из appt.startAt
        const curStartMin = current.getUTCHours() * 60 + current.getUTCMinutes();
        const startTimeStr =
            dto.startTime ??
            `${String(Math.floor(curStartMin / 60)).padStart(2, "0")}:${String(curStartMin % 60).padStart(2, "0")}`;

        if (!isHHMM(startTimeStr)) throw new BadRequestException("startTime must be HH:MM");

        const startMin = hhmmToMin(startTimeStr);
        if (startMin % 15 !== 0) throw new BadRequestException("Time must be multiple of 15 minutes");

        const newStartAt = new Date(baseDateUTC00.getTime() + startMin * 60000);

        // 3) услуги: либо оставляем как есть, либо заменяем
        let serviceItems: { serviceId: string; durationMin: number; price: number }[] | null = null;

        if (wantsChangeServices) {
            const ids = dto.serviceIds ?? [];
            if (ids.length === 0) throw new BadRequestException("serviceIds cannot be empty");
            serviceItems = await this.buildServiceItems(companyId, appt.masterEmployeeId, ids);
        } else {
            // оставить текущие услуги: читаем AppointmentService
            const currentItems = await this.prisma.appointmentService.findMany({
                where: { appointmentId: appt.id },
                orderBy: { sortOrder: "asc" },
                select: { serviceId: true, durationMin: true, price: true },
            });
            if (currentItems.length === 0) throw new BadRequestException("Appointment has no services");
            serviceItems = currentItems;
        }

        const totalDuration = serviceItems.reduce((sum, it) => sum + it.durationMin, 0);
        if (totalDuration % 15 !== 0) throw new BadRequestException("Total duration must be multiple of 15 minutes");

        const newEndAt = new Date(newStartAt.getTime() + totalDuration * 60000);

        // 4) пересечения: но нужно исключить саму запись
        const overlap = await this.prisma.appointment.findFirst({
            where: {
                companyId,
                masterEmployeeId: appt.masterEmployeeId,
                id: { not: appt.id },
                startAt: { lt: newEndAt },
                endAt: { gt: newStartAt },
                status: { notIn: ["canceled"] },
            },
            select: { id: true },
        });
        if (overlap) throw new BadRequestException("Time slot is already taken");

        // 5) транзакция: обновляем appointment, при замене услуг — переписываем AppointmentService, пересчитываем totals
        return this.prisma.$transaction(async (tx) => {
            if (wantsChangeServices) {
                // удаляем старые услуги и вставляем новые (для MVP — проще и честно)
                await tx.appointmentService.deleteMany({ where: { appointmentId: appt.id } });

                await tx.appointmentService.createMany({
                    data: serviceItems!.map((it, idx) => ({
                        appointmentId: appt.id,
                        serviceId: it.serviceId,
                        durationMin: it.durationMin,
                        price: it.price,
                        sortOrder: 100 + idx,
                    })),
                });
            }

            // апдейт времени и комментария
            await tx.appointment.update({
                where: { id: appt.id },
                data: {
                    startAt: newStartAt,
                    endAt: newEndAt,
                    ...(dto.comment !== undefined ? { comment: dto.comment?.trim() || null } : {}),
                },
            });

            // пересчёт totals (услуги + товары)
            // используем твой helper, который делает aggregate по AppointmentService и AppointmentProduct
            if (typeof (this as any).recalcTotals === "function") {
                await (this as any).recalcTotals(tx as any, appt.id);
            } else {
                // если вдруг helper не существует — делаем прямо здесь
                const sSum = await tx.appointmentService.aggregate({ where: { appointmentId: appt.id }, _sum: { price: true } });
                const pSum = await tx.appointmentProduct.aggregate({ where: { appointmentId: appt.id }, _sum: { total: true } });
                const totalServices = sSum._sum.price ?? 0;
                const totalProducts = pSum._sum.total ?? 0;
                await tx.appointment.update({
                    where: { id: appt.id },
                    data: { totalServices, totalProducts, total: totalServices + totalProducts },
                });
            }

            // отдаём обновлённую запись
            return tx.appointment.findUnique({
                where: { id: appt.id },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    branchId: true,
                    masterEmployeeId: true,
                    clientId: true,
                    startAt: true,
                    endAt: true,
                    comment: true,
                    totalServices: true,
                    totalProducts: true,
                    total: true,
                    services: {
                        orderBy: { sortOrder: "asc" },
                        select: {
                            id: true,
                            durationMin: true,
                            price: true,
                            service: { select: { id: true, name: true } },
                        },
                    },
                    products: {
                        select: {
                            id: true,
                            qty: true,
                            price: true,
                            total: true,
                            product: { select: { id: true, name: true } },
                        },
                    },
                },
            });
        });
    }

    async updateStatus(
        companyId: string,
        appointmentId: string,
        dto: { status: string; comment?: string },
    ) {
        const appt = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: {
                id: true,
                status: true,
                type: true,
            },
        });

        if (!appt) throw new NotFoundException("Appointment not found");

        if (appt.status === dto.status) {
            throw new BadRequestException("Status is already set");
        }

        this.assertStatusTransition(appt.status, dto.status);

        // business-ограничения
        if (appt.type === "block" && dto.status !== "canceled") {
            throw new BadRequestException("Block appointment can only be canceled");
        }

        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: dto.status as any,
                ...(dto.comment !== undefined ? { comment: dto.comment.trim() || null } : {}),
            },
            select: {
                id: true,
                type: true,
                status: true,
                comment: true,
                startAt: true,
                endAt: true,
                total: true,
                updatedAt: true,
            },
        });
    }

    async update(
        companyId: string,
        appointmentId: string,
        dto: {
            masterEmployeeId?: string;
            date?: string;
            startTime?: string;
            comment?: string;
            clientId?: string;
            services?: { serviceId: string; sortOrder: number }[];
        },
    ) {
        const appt = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, companyId },
            select: {
                id: true,
                status: true,
                type: true,
                branchId: true,
                masterEmployeeId: true,
                startAt: true,
                endAt: true,
            },
        });

        if (!appt) throw new NotFoundException("Appointment not found");
        if (appt.type === "block") {
            throw new BadRequestException("Cannot edit block appointment");
        }

        // Build update data
        const updateData: any = {};
        
        if (dto.comment !== undefined) {
            updateData.comment = dto.comment.trim() || null;
        }
        
        if (dto.clientId !== undefined) {
            if (dto.clientId) {
                await this.assertClient(companyId, dto.clientId);
                updateData.clientId = dto.clientId;
            } else {
                updateData.clientId = null;
            }
        }

        // Handle employee change
        if (dto.masterEmployeeId && dto.masterEmployeeId !== appt.masterEmployeeId) {
            await this.assertEmployee(companyId, dto.masterEmployeeId);
            updateData.masterEmployeeId = dto.masterEmployeeId;
        }

        // Handle date/time change
        let newStartAt = appt.startAt;
        let newEndAt = appt.endAt;
        
        if (dto.date || dto.startTime) {
            const dateStr = dto.date || formatDateYYYYMMDD(appt.startAt);
            const timeStr = dto.startTime || formatTimeHHMM(appt.startAt);
            
            const baseDate = parseDateYYYYMMDD(dateStr);
            const [hours, mins] = timeStr.split(":").map(Number);
            newStartAt = new Date(baseDate.getTime() + (hours * 60 + mins) * 60000);
            
            // Calculate new end time based on services duration
            if (dto.services && dto.services.length > 0) {
                const serviceIds = dto.services.map(s => s.serviceId);
                const services = await this.prisma.service.findMany({
                    where: { id: { in: serviceIds }, companyId },
                    select: { id: true, durationMin: true },
                });
                const durationMap = new Map(services.map(s => [s.id, s.durationMin]));
                const totalMinutes = dto.services.reduce((sum, s) => sum + (durationMap.get(s.serviceId) || 0), 0);
                newEndAt = new Date(newStartAt.getTime() + totalMinutes * 60000);
            } else {
                // Keep same duration
                const duration = appt.endAt.getTime() - appt.startAt.getTime();
                newEndAt = new Date(newStartAt.getTime() + duration);
            }
            
            updateData.startAt = newStartAt;
            updateData.endAt = newEndAt;
        }

        return this.prisma.$transaction(async (tx) => {
            // Update appointment basic fields
            await tx.appointment.update({
                where: { id: appointmentId },
                data: updateData,
            });

            // Update services if provided
            if (dto.services && dto.services.length > 0) {
                // Delete existing services
                await tx.appointmentService.deleteMany({
                    where: { appointmentId },
                });

                // Get service details
                const serviceIds = dto.services.map(s => s.serviceId);
                const services = await tx.service.findMany({
                    where: { id: { in: serviceIds }, companyId },
                    select: { 
                        id: true, 
                        durationMin: true,
                        pricesByRank: {
                            select: { price: true },
                            take: 1,
                        },
                    },
                });
                const serviceMap = new Map(services.map(s => [s.id, s]));

                // Create new services
                for (const s of dto.services) {
                    const service = serviceMap.get(s.serviceId);
                    if (!service) continue;
                    
                    const price = service.pricesByRank[0]?.price || 0;
                    await tx.appointmentService.create({
                        data: {
                            appointmentId,
                            serviceId: s.serviceId,
                            durationMin: service.durationMin,
                            price,
                            sortOrder: s.sortOrder,
                        },
                    });
                }

                // Recalculate totals
                await this.recalcTotals(tx as any, appointmentId);
            }

            // Return updated appointment
            return tx.appointment.findUnique({
                where: { id: appointmentId },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    comment: true,
                    startAt: true,
                    endAt: true,
                    total: true,
                    masterEmployeeId: true,
                    clientId: true,
                    services: {
                        orderBy: { sortOrder: "asc" },
                        select: {
                            id: true,
                            durationMin: true,
                            price: true,
                            service: { select: { id: true, name: true } },
                        },
                    },
                },
            });
        });
    }

}

// Helper functions
function formatDateYYYYMMDD(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatTimeHHMM(date: Date): string {
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}
