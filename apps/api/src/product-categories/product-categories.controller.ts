import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ProductCategoriesService } from "./product-categories.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";

@Controller("product-categories")
@UseGuards(JwtAuthGuard)
export class ProductCategoriesController {
    constructor(private readonly cats: ProductCategoriesService) {}

    @Get()
    list(@CurrentUser() user: { sub: string; companyId: string }) {
        return this.cats.list(user.companyId);
    }

    @Get(":id")
    getOne(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.cats.getOne(user.companyId, id);
    }

    @Post()
    create(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: CreateProductCategoryDto) {
        return this.cats.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateProductCategoryDto,
    ) {
        return this.cats.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.cats.remove(user.companyId, id);
    }
}
