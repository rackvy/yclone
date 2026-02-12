import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { StockMovementsService } from "./stock-movements.service";
import { BaseMovementDto } from "./dto/base-movement.dto";
import { AdjustMovementDto } from "./dto/adjust-movement.dto";
import { TransferMovementDto } from "./dto/transfer-movement.dto";

@Controller("stock-movements")
@UseGuards(JwtAuthGuard)
export class StockMovementsController {
    constructor(private readonly stock: StockMovementsService) {}

    // GET /stock-movements?branchId=...&productId=...&take=100
    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId: string,
        @Query("productId") productId?: string,
        @Query("take") take?: string,
    ) {
        return this.stock.list(user.companyId, branchId, productId, take ? Number(take) : 100);
    }

    @Post("in")
    in(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: BaseMovementDto) {
        return this.stock.in(user.companyId, dto);
    }

    @Post("out")
    out(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: BaseMovementDto) {
        return this.stock.out(user.companyId, dto);
    }

    @Post("adjust")
    adjust(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: AdjustMovementDto) {
        return this.stock.adjust(user.companyId, dto);
    }

    @Post("transfer")
    transfer(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: TransferMovementDto) {
        return this.stock.transfer(user.companyId, dto);
    }
}
