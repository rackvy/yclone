import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OpenShiftDto } from "./dto/open-shift.dto";
import { CloseShiftDto } from "./dto/close-shift.dto";
import { ListShiftsDto } from "./dto/list-shifts.dto";

@Injectable()
export class CashShiftsService {
    constructor(private readonly prisma: PrismaService) {}

    // Открыть смену (идемпотентно)
    async openShift(companyId: string, employeeId: string | undefined, dto: OpenShiftDto) {
        // Проверяем филиал
        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, companyId },
        });
        if (!branch) {
            throw new NotFoundException("Филиал не найден");
        }

        // Парсим дату как локальную (YYYY-MM-DD) и компенсируем часовой пояс
        // getTimezoneOffset() возвращает разницу в минутах между UTC и локальным временем
        // Для UTC+10 возвращает -600, значит UTC = local + 600 мин
        // Чтобы получить UTC-время которое соответствует local midnight, нужно вычесть offset
        const [year, month, day] = dto.date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const timezoneOffset = localDate.getTimezoneOffset() * 60 * 1000; // в миллисекундах
        const date = new Date(localDate.getTime() - timezoneOffset);
        console.log('[openShift] dto.date:', dto.date, '-> local:', localDate.toISOString(), '-> adjusted:', date.toISOString());

        // Проверяем есть ли уже открытая смена
        const existing = await this.prisma.cashShift.findUnique({
            where: {
                companyId_branchId_date: {
                    companyId,
                    branchId: dto.branchId,
                    date,
                },
            },
        });

        if (existing) {
            if (existing.status === "open") {
                return existing; // Уже открыта - возвращаем как есть
            }
            throw new BadRequestException("Смена на этот день уже закрыта");
        }

        // Создаём новую смену
        return this.prisma.cashShift.create({
            data: {
                companyId,
                branchId: dto.branchId,
                date,
                status: "open",
                openedByEmployeeId: employeeId,
                comment: dto.comment,
            },
        });
    }

    // Закрыть смену
    async closeShift(companyId: string, employeeId: string | undefined, shiftId: string, dto: CloseShiftDto) {
        const shift = await this.prisma.cashShift.findFirst({
            where: { id: shiftId, companyId },
        });

        if (!shift) {
            throw new NotFoundException("Смена не найдена");
        }

        if (shift.status === "closed") {
            throw new BadRequestException("Смена уже закрыта");
        }

        // Получаем все платежи за этот день в этом филиале
        const startOfDay = new Date(shift.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(shift.date);
        endOfDay.setHours(23, 59, 59, 999);

        // Получаем кассовые методы оплаты
        const cashMethods = await this.prisma.paymentMethod.findMany({
            where: { companyId, type: "cash" },
            select: { id: true },
        });
        const cashMethodIds = cashMethods.map((m) => m.id);

        // Считаем ожидаемую сумму наличных
        let expectedCash = 0;

        if (cashMethodIds.length > 0) {
            const appointmentPayments = await this.prisma.appointmentPayment.aggregate({
                where: {
                    companyId,
                    branchId: shift.branchId,
                    direction: "income",
                    paidAt: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    methodId: { in: cashMethodIds },
                },
                _sum: { amountKopeks: true },
            });

            const salePayments = await this.prisma.salePayment.aggregate({
                where: {
                    companyId,
                    branchId: shift.branchId,
                    direction: "income",
                    paidAt: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    methodId: { in: cashMethodIds },
                },
                _sum: { amountKopeks: true },
            });

            expectedCash = (appointmentPayments._sum.amountKopeks || 0) + (salePayments._sum.amountKopeks || 0);
        }

        const diffCash = dto.actualCash - expectedCash;

        return this.prisma.cashShift.update({
            where: { id: shiftId },
            data: {
                status: "closed",
                closedAt: new Date(),
                closedByEmployeeId: employeeId,
                expectedCash,
                actualCash: dto.actualCash,
                diffCash,
                comment: dto.comment || shift.comment,
            },
        });
    }

    // Получить список смен
    async listShifts(companyId: string, dto: ListShiftsDto) {
        const where: any = { companyId };

        if (dto.branchId) {
            where.branchId = dto.branchId;
        }

        if (dto.date) {
            // Парсим дату как локальную (YYYY-MM-DD) и компенсируем часовой пояс
            const [year, month, day] = dto.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            const timezoneOffset = localDate.getTimezoneOffset() * 60 * 1000;
            const date = new Date(localDate.getTime() - timezoneOffset);
            where.date = date;
        }

        return this.prisma.cashShift.findMany({
            where,
            orderBy: { date: "desc" },
            include: {
                branch: { select: { id: true, name: true } },
                openedByEmployee: { select: { id: true, fullName: true } },
                closedByEmployee: { select: { id: true, fullName: true } },
            },
        });
    }

    // Получить одну смену
    async getShift(companyId: string, shiftId: string) {
        const shift = await this.prisma.cashShift.findFirst({
            where: { id: shiftId, companyId },
            include: {
                branch: { select: { id: true, name: true } },
                openedByEmployee: { select: { id: true, fullName: true } },
                closedByEmployee: { select: { id: true, fullName: true } },
            },
        });

        if (!shift) {
            throw new NotFoundException("Смена не найдена");
        }

        return shift;
    }
}
