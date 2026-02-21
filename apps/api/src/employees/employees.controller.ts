import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Controller("employees")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
    constructor(private readonly employees: EmployeesService) {}

    @Get()
    list(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
    ) {
        return this.employees.list(user.companyId, branchId);
    }

    @Get(":id")
    get(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.get(user.companyId, id);
    }

    @Post()
    @Roles('owner', 'admin')
    create(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: CreateEmployeeDto,
    ) {
        return this.employees.create(user.companyId, dto);
    }

    @Patch(":id")
    @Roles('owner', 'admin')
    update(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateEmployeeDto,
    ) {
        return this.employees.update(user.companyId, id, dto);
    }

    @Delete(":id")
    @Roles('owner', 'admin')
    remove(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.remove(user.companyId, id);
    }

    @Post(":id/terminate")
    @Roles('owner', 'admin')
    terminate(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
    ) {
        return this.employees.terminate(user.companyId, id);
    }

    @Post(":id/reactivate")
    @Roles('owner', 'admin')
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
    @Roles('owner', 'admin')
    addService(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Param("serviceId") serviceId: string,
    ) {
        return this.employees.addService(user.companyId, id, serviceId);
    }

    @Delete(":id/services/:serviceId")
    @Roles('owner', 'admin')
    removeService(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Param("serviceId") serviceId: string,
    ) {
        return this.employees.removeService(user.companyId, id, serviceId);
    }
}
