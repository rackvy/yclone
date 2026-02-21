import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { FinanceAccess } from "../common/decorators/roles.decorator";
import { ReportsService } from "./reports.service";

@Controller("api/reports")
@UseGuards(JwtAuthGuard)
@FinanceAccess() // Только owner, admin, manager (master - нет)
export class ReportsController {
    constructor(private readonly reports: ReportsService) {}

    @Get("cashbox-day")
    getCashboxDayReport(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("date") date: string,
        @Query("branchId") branchId?: string,
    ) {
        // Если дата не указана, используем сегодня
        const reportDate = date || new Date().toISOString().split("T")[0];
        return this.reports.getCashboxDayReport(user.companyId, reportDate, branchId);
    }

    // ==================== STAGE 5: Finance Reports ====================

    @Get("summary")
    getSummaryReport(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("from") from: string,
        @Query("to") to: string,
        @Query("branchId") branchId?: string,
    ) {
        const fromDate = from || new Date().toISOString().split("T")[0];
        const toDate = to || fromDate;
        return this.reports.getSummaryReport(user.companyId, fromDate, toDate, branchId);
    }

    @Get("masters")
    getMastersReport(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("from") from: string,
        @Query("to") to: string,
        @Query("branchId") branchId?: string,
    ) {
        const fromDate = from || new Date().toISOString().split("T")[0];
        const toDate = to || fromDate;
        return this.reports.getMastersReport(user.companyId, fromDate, toDate, branchId);
    }

    @Get("products")
    getProductsReport(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("from") from: string,
        @Query("to") to: string,
        @Query("branchId") branchId?: string,
    ) {
        const fromDate = from || new Date().toISOString().split("T")[0];
        const toDate = to || fromDate;
        return this.reports.getProductsReport(user.companyId, fromDate, toDate, branchId);
    }
}
