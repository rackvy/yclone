import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { WaitlistService } from "./waitlist.service";
import { CreateWaitlistDto } from "./dto/create-waitlist.dto";
import { UpdateWaitlistDto } from "./dto/update-waitlist.dto";

@Controller("waitlist")
@UseGuards(JwtAuthGuard)
export class WaitlistController {
    constructor(private readonly waitlist: WaitlistService) {}

    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
        @Query("status") status?: string,
    ) {
        return this.waitlist.list(user.companyId, branchId, status);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateWaitlistDto,
    ) {
        return this.waitlist.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateWaitlistDto,
    ) {
        return this.waitlist.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.waitlist.remove(user.companyId, id);
    }
}
