import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { ListSalesDto } from "./dto/list-sales.dto";

@Controller("/api/sales")
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(
        private readonly sales: SalesService,
        private readonly prisma: PrismaService,
    ) {}

    // Создать продажу
    @Post()
    async createSale(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateSaleDto
    ) {
        // Находим сотрудника по userId для аналитики
        const employee = await this.prisma.employee.findFirst({
            where: { userId: user.sub, companyId: user.companyId },
        });
        return this.sales.createSale(user.companyId, employee?.id, dto);
    }

    // Получить список продаж
    @Get()
    listSales(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query() dto: ListSalesDto
    ) {
        return this.sales.listSales(user.companyId, dto);
    }

    // Получить детали продажи
    @Get(":id")
    getSale(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") saleId: string
    ) {
        return this.sales.getSaleById(user.companyId, saleId);
    }

    // Добавить платеж
    @Post(":id/payments")
    addPayment(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") saleId: string,
        @Body() dto: AddPaymentDto
    ) {
        return this.sales.addPayment(user.companyId, user.sub, saleId, dto);
    }
}
