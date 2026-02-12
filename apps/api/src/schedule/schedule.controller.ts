import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ScheduleService } from "./schedule.service";
import { UpsertRulesDto } from "./dto/upsert-rules.dto";
import { UpsertExceptionDto } from "./dto/upsert-exception.dto";

@Controller("schedule")
@UseGuards(JwtAuthGuard)
export class ScheduleController {
    constructor(private readonly schedule: ScheduleService) {}

    // GET /schedule/rules?employeeId=...
    @Get("rules")
    getRules(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("employeeId") employeeId: string,
    ) {
        return this.schedule.getRules(user.companyId, employeeId);
    }

    // POST /schedule/rules  { employeeId, days: [...] }
    @Post("rules")
    upsertRules(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: UpsertRulesDto) {
        return this.schedule.upsertRules(user.companyId, dto.employeeId, dto.days);
    }

    // GET /schedule/exceptions?employeeId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
    @Get("exceptions")
    listExceptions(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("employeeId") employeeId: string,
        @Query("from") from: string,
        @Query("to") to: string,
    ) {
        return this.schedule.listExceptions(user.companyId, employeeId, from, to);
    }

    // POST /schedule/exceptions { employeeId, date, isWorkingDay, startTime?, endTime? }
    @Post("exceptions")
    upsertException(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: UpsertExceptionDto) {
        return this.schedule.upsertException(user.companyId, dto);
    }

    // DELETE /schedule/exceptions?employeeId=...&date=YYYY-MM-DD
    @Delete("exceptions")
    removeException(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("employeeId") employeeId: string,
        @Query("date") date: string,
    ) {
        return this.schedule.removeException(user.companyId, employeeId, date);
    }

    // GET /schedule/blocks?employeeId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
    @Get("blocks")
    listBlocks(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("employeeId") employeeId: string,
        @Query("from") from: string,
        @Query("to") to: string,
    ) {
        return this.schedule.listBlocks(user.companyId, employeeId, from, to);
    }

    // POST /schedule/blocks { employeeId, date, startTime, endTime, reason? }
    @Post("blocks")
    createBlock(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: any) {
        return this.schedule.createBlock(user.companyId, dto);
    }

    // DELETE /schedule/blocks/:id
    @Delete("blocks/:id")
    deleteBlock(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.schedule.deleteBlock(user.companyId, id);
    }
}
