import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly users: UsersService) {}

    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
    ) {
        return this.users.list(user.companyId);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateUserDto,
    ) {
        return this.users.create(user.companyId, dto);
    }

    @Get("profile")
    getProfile(
        @CurrentUser() user: { sub: string; companyId: string },
    ) {
        return this.users.getProfile(user.sub);
    }

    @Patch("profile")
    updateProfile(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: UpdateProfileDto,
    ) {
        return this.users.updateProfile(user.sub, user.companyId, dto);
    }

    @Post("change-password")
    changePassword(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: ChangePasswordDto,
    ) {
        return this.users.changePassword(user.sub, dto);
    }
}
