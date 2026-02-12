import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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

@Injectable()
export class ScheduleService {
    constructor(private readonly prisma: PrismaService) {}

    private async assertEmployee(companyId: string, employeeId: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true, companyId: true },
        });
        if (!emp) throw new BadRequestException("Employee does not belong to your company");
        return emp;
    }

    async getRules(companyId: string, employeeId: string) {
        await this.assertEmployee(companyId, employeeId);

        const rules = await this.prisma.workScheduleRule.findMany({
            where: { employeeId }, // companyId опционально (если добавил в схему — добавь сюда)
            orderBy: { dayOfWeek: "asc" },
            select: {
                id: true,
                dayOfWeek: true,
                isWorkingDay: true,
                startTime: true,
                endTime: true,
            },
        });

        return { employeeId, days: rules };
    }

    async upsertRules(companyId: string, employeeId: string, days: any[]) {
        await this.assertEmployee(companyId, employeeId);

        // валидируем массив 0..6
        const byDay = new Map<number, any>();
        for (const d of days) {
            if (typeof d.dayOfWeek !== "number" || d.dayOfWeek < 0 || d.dayOfWeek > 6) {
                throw new BadRequestException("dayOfWeek must be 0..6");
            }
            if (byDay.has(d.dayOfWeek)) throw new BadRequestException("Duplicate dayOfWeek");
            if (typeof d.isWorkingDay !== "boolean") throw new BadRequestException("isWorkingDay is required");

            if (d.isWorkingDay) {
                if (!d.startTime || !d.endTime) throw new BadRequestException("startTime/endTime required");
                if (!isHHMM(d.startTime) || !isHHMM(d.endTime)) throw new BadRequestException("Time must be HH:MM");

                const s = hhmmToMin(d.startTime);
                const e = hhmmToMin(d.endTime);
                assertStep15(s);
                assertStep15(e);
                if (e <= s) throw new BadRequestException("endTime must be greater than startTime");
            }

            byDay.set(d.dayOfWeek, d);
        }

        // если каких-то дней нет — считаем выходными
        const full = Array.from({ length: 7 }).map((_, dayOfWeek) => {
            const d = byDay.get(dayOfWeek);
            if (!d) return { dayOfWeek, isWorkingDay: false, startTime: null, endTime: null };
            if (!d.isWorkingDay) return { dayOfWeek, isWorkingDay: false, startTime: null, endTime: null };
            return { dayOfWeek, isWorkingDay: true, startTime: d.startTime, endTime: d.endTime };
        });

        return this.prisma.$transaction(async (tx) => {
            // удаляем старые и создаём заново (проще для MVP)
            await tx.workScheduleRule.deleteMany({ where: { employeeId } });

            await tx.workScheduleRule.createMany({
                data: full.map((d) => ({
                    companyId, // если добавил поле в схему
                    employeeId,
                    dayOfWeek: d.dayOfWeek,
                    isWorkingDay: d.isWorkingDay,
                    startTime: d.startTime,
                    endTime: d.endTime,
                })),
            });

            return this.getRules(companyId, employeeId);
        });
    }

    async listExceptions(companyId: string, employeeId: string, from: string, to: string) {
        await this.assertEmployee(companyId, employeeId);

        const fromD = parseDateYYYYMMDD(from);
        const toD = parseDateYYYYMMDD(to);

        const items = await this.prisma.workScheduleException.findMany({
            where: {
                employeeId,
                date: { gte: fromD, lte: toD },
            },
            orderBy: { date: "asc" },
            select: {
                id: true,
                date: true,
                isWorkingDay: true,
                startTime: true,
                endTime: true,
            },
        });

        return { employeeId, from, to, items };
    }

    async upsertException(companyId: string, dto: { employeeId: string; date: string; isWorkingDay: boolean; startTime?: string; endTime?: string }) {
        await this.assertEmployee(companyId, dto.employeeId);

        const date = parseDateYYYYMMDD(dto.date);

        if (dto.isWorkingDay) {
            if (!dto.startTime || !dto.endTime) throw new BadRequestException("startTime/endTime required");
            if (!isHHMM(dto.startTime) || !isHHMM(dto.endTime)) throw new BadRequestException("Time must be HH:MM");

            const s = hhmmToMin(dto.startTime);
            const e = hhmmToMin(dto.endTime);
            assertStep15(s);
            assertStep15(e);
            if (e <= s) throw new BadRequestException("endTime must be greater than startTime");
        }

        return this.prisma.workScheduleException.upsert({
            where: { employeeId_date: { employeeId: dto.employeeId, date } },
            create: {
                companyId, // если добавил поле в схему
                employeeId: dto.employeeId,
                date,
                isWorkingDay: dto.isWorkingDay,
                startTime: dto.isWorkingDay ? dto.startTime! : null,
                endTime: dto.isWorkingDay ? dto.endTime! : null,
            },
            update: {
                isWorkingDay: dto.isWorkingDay,
                startTime: dto.isWorkingDay ? dto.startTime! : null,
                endTime: dto.isWorkingDay ? dto.endTime! : null,
            },
            select: {
                id: true,
                date: true,
                isWorkingDay: true,
                startTime: true,
                endTime: true,
            },
        });
    }

    async removeException(companyId: string, employeeId: string, dateStr: string) {
        await this.assertEmployee(companyId, employeeId);
        const date = parseDateYYYYMMDD(dateStr);

        const ex = await this.prisma.workScheduleException.findUnique({
            where: { employeeId_date: { employeeId, date } },
            select: { id: true },
        });
        if (!ex) throw new NotFoundException("Exception not found");

        await this.prisma.workScheduleException.delete({
            where: { employeeId_date: { employeeId, date } },
        });

        return { ok: true };
    }

    // Блокировки времени (перерывы)
    async listBlocks(companyId: string, employeeId: string, from: string, to: string) {
        await this.assertEmployee(companyId, employeeId);

        const fromD = parseDateYYYYMMDD(from);
        const toD = parseDateYYYYMMDD(to);

        const blocks = await this.prisma.workScheduleBlock.findMany({
            where: {
                employeeId,
                date: { gte: fromD, lte: toD },
            },
            orderBy: { date: "asc" },
            select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                reason: true,
            },
        });

        return { employeeId, from, to, blocks };
    }

    async createBlock(companyId: string, dto: { employeeId: string; date: string; startTime: string; endTime: string; reason?: string }) {
        await this.assertEmployee(companyId, dto.employeeId);

        const date = parseDateYYYYMMDD(dto.date);

        if (!isHHMM(dto.startTime) || !isHHMM(dto.endTime)) {
            throw new BadRequestException("Time must be HH:MM");
        }

        const s = hhmmToMin(dto.startTime);
        const e = hhmmToMin(dto.endTime);
        assertStep15(s);
        assertStep15(e);
        if (e <= s) throw new BadRequestException("endTime must be greater than startTime");

        return this.prisma.workScheduleBlock.create({
            data: {
                companyId,
                employeeId: dto.employeeId,
                date,
                startTime: dto.startTime,
                endTime: dto.endTime,
                reason: dto.reason ?? null,
            },
            select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                reason: true,
            },
        });
    }

    async deleteBlock(companyId: string, blockId: string) {
        const block = await this.prisma.workScheduleBlock.findFirst({
            where: { id: blockId, companyId },
            select: { id: true },
        });
        if (!block) throw new NotFoundException("Block not found");

        await this.prisma.workScheduleBlock.delete({ where: { id: blockId } });
        return { ok: true };
    }
}
