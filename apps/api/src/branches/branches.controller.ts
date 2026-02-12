import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Controller("branches")
@UseGuards(JwtAuthGuard)
export class BranchesController {
    constructor(private readonly branches: BranchesService) {}

    @Get()
    list(@CurrentUser() user: { sub: string; companyId: string }) {
        return this.branches.list(user.companyId);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateBranchDto,
    ) {
        return this.branches.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateBranchDto,
    ) {
        return this.branches.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.branches.remove(user.companyId, id);
    }
}
