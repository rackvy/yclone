import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DashboardService } from "../dashboard/dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboard: DashboardService) {}

    @Get("stats")
    getStats(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboard.getStats(user.companyId, branchId);
    }

    @Get("revenue-chart")
    getRevenueChart(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
        @Query("period") period: 'week' | 'month' | 'year' = 'month',
    ) {
        return this.dashboard.getRevenueChart(user.companyId, branchId, period);
    }

    @Get("services-chart")
    getServicesChart(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("from") from: string,
        @Query("to") to: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboard.getServicesChart(user.companyId, branchId, from, to);
    }

    @Get("recent-appointments")
    getRecentAppointments(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
        @Query("limit") limit: string = '5',
    ) {
        return this.dashboard.getRecentAppointments(user.companyId, branchId, parseInt(limit));
    }
}
