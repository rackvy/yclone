import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Interval = { startMin: number; endMin: number }; // [start, end)

function isHHMM(s: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
function hhmmToMin(s: string): number {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
}
function minToHHMM(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
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
function dayOfWeekMon0(dateUTC00: Date): number {
    // JS: Sun=0..Sat=6 -> нам надо Mon=0..Sun=6
    const js = dateUTC00.getUTCDay(); // 0..6 (Sun..Sat)
    return (js + 6) % 7;
}
function clipInterval(i: Interval, minA: number, minB: number): Interval | null {
    const s = Math.max(i.startMin, minA);
    const e = Math.min(i.endMin, minB);
    return e > s ? { startMin: s, endMin: e } : null;
}
function mergeIntervals(items: Interval[]): Interval[] {
    const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
    const res: Interval[] = [];
    for (const it of sorted) {
        if (res.length === 0) {
            res.push({ ...it });
            continue;
        }
        const last = res[res.length - 1];
        if (it.startMin <= last.endMin) {
            last.endMin = Math.max(last.endMin, it.endMin);
        } else {
            res.push({ ...it });
        }
    }
    return res;
}
function subtractIntervals(base: Interval, busy: Interval[]): Interval[] {
    // base - union(busy)
    const b = mergeIntervals(busy);
    const res: Interval[] = [];
    let curStart = base.startMin;

    for (const it of b) {
        if (it.endMin <= curStart) continue;
        if (it.startMin >= base.endMin) break;

        const start = Math.max(it.startMin, base.startMin);
        const end = Math.min(it.endMin, base.endMin);

        if (start > curStart) res.push({ startMin: curStart, endMin: start });
        curStart = Math.max(curStart, end);
    }

    if (curStart < base.endMin) res.push({ startMin: curStart, endMin: base.endMin });
    return res;
}

@Injectable()
export class AvailabilityService {
    constructor(private readonly prisma: PrismaService) {}

    private async assertEmployee(companyId: string, employeeId: string) {
        const emp = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
            select: { id: true, branchId: true },
        });
        if (!emp) throw new BadRequestException("Employee does not belong to your company");
        return emp;
    }

    private normalizeDuration(durationMin?: number): number {
        const d = durationMin ?? 15;
        if (d < 15) throw new BadRequestException("durationMin must be >= 15");
        assertStep15(d);
        return d;
    }

    async getAvailability(params: {
        companyId: string;
        employeeId: string;
        date: string;
        durationMin?: number;
    }) {
        const { companyId, employeeId } = params;
        const dateUTC00 = parseDateYYYYMMDD(params.date);
        const durationMin = this.normalizeDuration(params.durationMin);

        await this.assertEmployee(companyId, employeeId);

        // 1) базовое правило по дню недели
        const dow = dayOfWeekMon0(dateUTC00);

        const rule = await this.prisma.workScheduleRule.findUnique({
            where: { employeeId_dayOfWeek: { employeeId, dayOfWeek: dow } },
            select: { isWorkingDay: true, startTime: true, endTime: true },
        });

        // если правила нет — считаем выходной
        if (!rule || !rule.isWorkingDay) {
            return { employeeId, date: params.date, durationMin, slots: [] as string[] };
        }

        if (!rule.startTime || !rule.endTime) {
            return { employeeId, date: params.date, durationMin, slots: [] as string[] };
        }
        if (!isHHMM(rule.startTime) || !isHHMM(rule.endTime)) {
            throw new BadRequestException("Invalid rule time format in DB");
        }

        let workStart = hhmmToMin(rule.startTime);
        let workEnd = hhmmToMin(rule.endTime);
        assertStep15(workStart);
        assertStep15(workEnd);
        if (workEnd <= workStart) return { employeeId, date: params.date, durationMin, slots: [] as string[] };

        // 2) исключение на дату (перебивает rule)
        const exception = await this.prisma.workScheduleException.findUnique({
            where: { employeeId_date: { employeeId, date: dateUTC00 } },
            select: { isWorkingDay: true, startTime: true, endTime: true },
        });

        if (exception) {
            if (!exception.isWorkingDay) {
                return { employeeId, date: params.date, durationMin, slots: [] as string[] };
            }
            if (!exception.startTime || !exception.endTime) {
                return { employeeId, date: params.date, durationMin, slots: [] as string[] };
            }
            if (!isHHMM(exception.startTime) || !isHHMM(exception.endTime)) {
                throw new BadRequestException("Invalid exception time format in DB");
            }
            workStart = hhmmToMin(exception.startTime);
            workEnd = hhmmToMin(exception.endTime);
            assertStep15(workStart);
            assertStep15(workEnd);
            if (workEnd <= workStart) {
                return { employeeId, date: params.date, durationMin, slots: [] as string[] };
            }
        }

        // 3) берём записи на этот день (по мастеру) и превращаем в busy intervals в минутах от 00:00
        const dayStart = dateUTC00; // 00:00Z
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000); // +1 day

        const appointments = await this.prisma.appointment.findMany({
            where: {
                companyId,
                masterEmployeeId: employeeId,
                // все записи, которые пересекаются с днем
                startAt: { lt: dayEnd },
                endAt: { gt: dayStart },
            },
            select: { startAt: true, endAt: true },
            orderBy: { startAt: "asc" },
        });

        const busyRaw: Interval[] = appointments.map((a) => {
            const s = Math.floor((a.startAt.getTime() - dayStart.getTime()) / 60000);
            const e = Math.ceil((a.endAt.getTime() - dayStart.getTime()) / 60000);
            return { startMin: s, endMin: e };
        });

        // ограничим busy рабочим окном, чтобы лишнее не мешало
        const busy: Interval[] = [];
        for (const b of busyRaw) {
            const clipped = clipInterval(b, workStart, workEnd);
            if (clipped) busy.push(clipped);
        }

        // 4) свободные интервалы = рабочее окно - busy
        const freeIntervals = subtractIntervals({ startMin: workStart, endMin: workEnd }, busy);

        // 5) разложим интервалы в слоты по 15 минут, учитывая durationMin
        const slots: string[] = [];
        for (const f of freeIntervals) {
            let t = f.startMin;
            // старт должен быть кратен 15 (у нас всё кратно 15, но подстрахуемся)
            t = Math.ceil(t / 15) * 15;

            while (t + durationMin <= f.endMin) {
                slots.push(minToHHMM(t));
                t += 15;
            }
        }

        return { employeeId, date: params.date, durationMin, work: { start: minToHHMM(workStart), end: minToHHMM(workEnd) }, slots };
    }
}
