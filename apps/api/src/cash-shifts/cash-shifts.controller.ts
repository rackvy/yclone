import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { FinanceAccess } from "../common/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CashShiftsService } from "./cash-shifts.service";
import { OpenShiftDto } from "./dto/open-shift.dto";
import { CloseShiftDto } from "./dto/close-shift.dto";
import { ListShiftsDto } from "./dto/list-shifts.dto";

@Controller("/api/shifts")
@UseGuards(JwtAuthGuard)
@FinanceAccess() // Только owner, admin, manager
export class CashShiftsController {
    constructor(
        private readonly shifts: CashShiftsService,
        private readonly prisma: PrismaService,
    ) {}

    // Открыть смену
    @Post("open")
    async openShift(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: OpenShiftDto
    ) {
        const employee = await this.prisma.employee.findFirst({
            where: { userId: user.sub, companyId: user.companyId },
        });
        return this.shifts.openShift(user.companyId, employee?.id, dto);
    }

    // Закрыть смену
    @Post(":id/close")
    async closeShift(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") shiftId: string,
        @Body() dto: CloseShiftDto
    ) {
        const employee = await this.prisma.employee.findFirst({
            where: { userId: user.sub, companyId: user.companyId },
        });
        return this.shifts.closeShift(user.companyId, employee?.id, shiftId, dto);
    }

    // Получить список смен
    @Get()
    listShifts(
        @CurrentUser() user: { companyId: string },
        @Query() dto: ListShiftsDto
    ) {
        return this.shifts.listShifts(user.companyId, dto);
    }

    // Получить одну смену
    @Get(":id")
    getShift(
        @CurrentUser() user: { companyId: string },
        @Param("id") shiftId: string
    ) {
        return this.shifts.getShift(user.companyId, shiftId);
    }
}
