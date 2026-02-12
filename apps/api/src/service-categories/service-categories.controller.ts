import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ServiceCategoriesService } from "./service-categories.service";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";

@Controller("service-categories")
@UseGuards(JwtAuthGuard)
export class ServiceCategoriesController {
    constructor(private readonly cats: ServiceCategoriesService) {}

    @Get()
    list(@CurrentUser() user: { sub: string; companyId: string }) {
        return this.cats.list(user.companyId);
    }

    @Get(":id")
    getOne(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.cats.getOne(user.companyId, id);
    }

    @Post()
    create(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: CreateServiceCategoryDto) {
        return this.cats.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateServiceCategoryDto,
    ) {
        return this.cats.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.cats.remove(user.companyId, id);
    }
}
