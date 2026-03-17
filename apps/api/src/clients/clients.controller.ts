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

    // ===== CERTIFICATES =====
    @Post(":id/certificates")
    addCertificate(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") clientId: string,
        @Body() dto: { name: string; amount: number; expiresAt?: string },
    ) {
        return this.clients.addCertificate(user.companyId, clientId, dto);
    }

    @Get(":id/certificates")
    listCertificates(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") clientId: string,
    ) {
        return this.clients.listCertificates(user.companyId, clientId);
    }

    @Patch("certificates/:certId")
    updateCertificate(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("certId") certId: string,
        @Body() dto: { remaining?: number; isActive?: boolean },
    ) {
        return this.clients.updateCertificate(user.companyId, certId, dto);
    }

    // ===== STATISTICS =====
    @Get(":id/stats")
    getStats(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") clientId: string,
    ) {
        return this.clients.getStats(user.companyId, clientId);
    }
}
