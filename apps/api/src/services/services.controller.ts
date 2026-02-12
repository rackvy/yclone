import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";


@Controller("services")
@UseGuards(JwtAuthGuard)
export class ServicesController {
    constructor(private readonly services: ServicesService) {}

    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("categoryId") categoryId?: string,
    ) {
        return this.services.list(user.companyId);
    }

    // удобно для “экран записи”: /services/for-rank?masterRankId=...
    @Get("for-rank")
    listForRank(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("masterRankId") masterRankId: string,
    ) {
        return this.services.listForRank(user.companyId, masterRankId);
    }

    @Get(":id")
    getOne(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.services.getOne(user.companyId, id);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateServiceDto,
    ) {
        return this.services.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateServiceDto,
    ) {
        return this.services.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.services.remove(user.companyId, id);
    }
}
