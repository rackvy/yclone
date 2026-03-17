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
import { InventoryService } from "./inventory.service";
import { CreateInventoryCountDto } from "./dto/inventory-count.dto";

@Controller("inventory")
@UseGuards(JwtAuthGuard)
export class InventoryController {
    constructor(private readonly inventory: InventoryService) {}

    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
        @Query("status") status?: string,
    ) {
        return this.inventory.list(user.companyId, branchId, status);
    }

    @Get(":id")
    getOne(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.inventory.getOne(user.companyId, id);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string; employeeId?: string },
        @Body() dto: CreateInventoryCountDto,
    ) {
        return this.inventory.create(user.companyId, user.employeeId, dto);
    }

    @Patch(":id/items/:itemId")
    updateItem(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Param("itemId") itemId: string,
        @Body() body: { actualQty: number },
    ) {
        return this.inventory.updateItem(user.companyId, id, itemId, body.actualQty);
    }

    @Post(":id/complete")
    complete(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() body: { applyStock: boolean },
    ) {
        return this.inventory.complete(user.companyId, id, body.applyStock ?? true);
    }

    @Post(":id/cancel")
    cancel(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.inventory.cancel(user.companyId, id);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.inventory.remove(user.companyId, id);
    }
}
