import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AvailabilityService } from "./availability.service";

@Controller("availability")
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
    constructor(private readonly availability: AvailabilityService) {}

    // GET /availability?employeeId=...&date=YYYY-MM-DD&durationMin=30
    @Get()
    get(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("employeeId") employeeId: string,
        @Query("date") date: string,
        @Query("durationMin") durationMin?: string,
    ) {
        const dur = durationMin ? Number(durationMin) : undefined;
        return this.availability.getAvailability({
            companyId: user.companyId,
            employeeId,
            date,
            durationMin: Number.isFinite(dur as number) ? (dur as number) : undefined,
        });
    }
}
