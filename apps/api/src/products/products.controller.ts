import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Controller("products")
@UseGuards(JwtAuthGuard)
export class ProductsController {
    constructor(private readonly products: ProductsService) {}

    // GET /products?branchId=...&categoryId=...&q=...
    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId: string,
        @Query("categoryId") categoryId?: string,
        @Query("q") q?: string,
    ) {
        return this.products.list(user.companyId, { branchId, categoryId, q });
    }

    @Get(":id")
    getOne(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.products.getOne(user.companyId, id);
    }

    @Post()
    create(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: CreateProductDto) {
        return this.products.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateProductDto,
    ) {
        return this.products.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.products.remove(user.companyId, id);
    }
}
