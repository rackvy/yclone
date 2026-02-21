import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { FinanceAccess } from "../common/decorators/roles.decorator";
import { CashboxesService } from "./cashboxes.service";
import { CreateCashboxDto } from "./dto/create-cashbox.dto";
import { UpdateCashboxDto } from "./dto/update-cashbox.dto";

@Controller("api/cashboxes")
@UseGuards(JwtAuthGuard)
@FinanceAccess() // Только owner, admin, manager
export class CashboxesController {
    constructor(private readonly cashboxes: CashboxesService) {}

    @Get()
    findAll(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
    ) {
        return this.cashboxes.findAll(user.companyId, branchId);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateCashboxDto,
    ) {
        return this.cashboxes.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateCashboxDto,
    ) {
        return this.cashboxes.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.cashboxes.remove(user.companyId, id);
    }

    @Post(":id/toggle-active")
    toggleActive(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.cashboxes.toggleActive(user.companyId, id);
    }
}
