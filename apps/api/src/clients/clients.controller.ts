import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ClientsService } from "./clients.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

@Controller("clients")
@UseGuards(JwtAuthGuard)
export class ClientsController {
    constructor(private readonly clients: ClientsService) {}

    // GET /clients?q=иван&take=50
    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("q") q?: string,
        @Query("take") take?: string,
    ) {
        return this.clients.list(user.companyId, q, take ? Number(take) : 50);
    }

    @Get(":id")
    getOne(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.clients.getOne(user.companyId, id);
    }

    @Post()
    create(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: CreateClientDto) {
        return this.clients.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateClientDto,
    ) {
        return this.clients.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.clients.remove(user.companyId, id);
    }
}
