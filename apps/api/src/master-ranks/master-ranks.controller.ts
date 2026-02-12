import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MasterRanksService } from "./master-ranks.service";
import { CreateMasterRankDto } from "./dto/create-master-rank.dto";
import { UpdateMasterRankDto } from "./dto/update-master-rank.dto";

@Controller("master-ranks")
@UseGuards(JwtAuthGuard)
export class MasterRanksController {
    constructor(private readonly ranks: MasterRanksService) {}

    @Get()
    list(@CurrentUser() user: { sub: string; companyId: string }) {
        return this.ranks.list(user.companyId);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateMasterRankDto,
    ) {
        return this.ranks.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateMasterRankDto,
    ) {
        return this.ranks.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.ranks.remove(user.companyId, id);
    }
}
