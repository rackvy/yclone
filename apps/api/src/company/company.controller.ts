import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CompanyService } from "./company.service";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Controller("company")
@UseGuards(JwtAuthGuard)
export class CompanyController {
    constructor(private readonly company: CompanyService) {}

    @Get("me")
    getMe(@CurrentUser() user: { sub: string; companyId: string }) {
        return this.company.getMe(user.companyId);
    }

    @Patch("me")
    updateMe(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: UpdateCompanyDto,
    ) {
        return this.company.updateMe(user.companyId, dto);
    }
}
