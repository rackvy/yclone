import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Controller("employees")
@UseGuards(JwtAuthGuard)
export class EmployeesController {
    constructor(private readonly employees: EmployeesService) {}

    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
    ) {
        return this.employees.list(user.companyId, branchId);
    }

    @Post()
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateEmployeeDto,
    ) {
        return this.employees.create(user.companyId, dto);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateEmployeeDto,
    ) {
        return this.employees.update(user.companyId, id, dto);
    }

    @Delete(":id")
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.remove(user.companyId, id);
    }

    @Post(":id/terminate")
    terminate(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.terminate(user.companyId, id);
    }

    @Post(":id/reactivate")
    reactivate(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.reactivate(user.companyId, id);
    }

    @Get(":id/services")
    getServices(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.getServices(user.companyId, id);
    }

    @Post(":id/services/:serviceId")
    addService(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Param("serviceId") serviceId: string,
    ) {
        return this.employees.addService(user.companyId, id, serviceId);
    }

    @Delete(":id/services/:serviceId")
    removeService(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Param("serviceId") serviceId: string,
    ) {
        return this.employees.removeService(user.companyId, id, serviceId);
    }
}
