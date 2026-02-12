import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { AddAppointmentProductsDto } from "./dto/add-appointment-products.dto";
import { BookAppointmentDto } from "./dto/book-appointment.dto";
import { RescheduleAppointmentDto } from "./dto/reschedule-appointment.dto";
import { UpdateAppointmentStatusDto } from "./dto/update-appointment-status.dto";


@Controller("appointments")
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
    constructor(private readonly appointments: AppointmentsService) {}

    @Post()
    create(@CurrentUser() user: { sub: string; companyId: string }, @Body() dto: CreateAppointmentDto) {
        return this.appointments.create(user.companyId, dto);
    }

    // GET /appointments/day?branchId=...&date=YYYY-MM-DD
    @Get("day")
    listDay(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId: string,
        @Query("date") date: string,
    ) {
        return this.appointments.listDay(user.companyId, branchId, date);
    }

    // PATCH /appointments/:id/cancel
    @Patch(":id/cancel")
    cancel(@CurrentUser() user: { sub: string; companyId: string }, @Param("id") id: string) {
        return this.appointments.cancel(user.companyId, id);
    }

    // POST /appointments/:id/products
    @Post(":id/products")
    addProducts(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: AddAppointmentProductsDto,
    ) {
        return this.appointments.addProducts(user.companyId, id, dto);
    }

    // POST /appointments/book
    @Post("book")
    book(
        @CurrentUser() user: { sub: string; companyId: string },
        @Body() dto: BookAppointmentDto,
    ) {
        return this.appointments.book(user.companyId, dto);
    }

    @Patch(":id/reschedule")
    reschedule(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: RescheduleAppointmentDto,
    ) {
        return this.appointments.reschedule(user.companyId, id, dto);
    }

    @Patch(":id/status")
    updateStatus(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") id: string,
        @Body() dto: UpdateAppointmentStatusDto,
    ) {
        return this.appointments.updateStatus(user.companyId, id, dto);
    }

    // GET /appointments/client/:clientId - получить все записи клиента
    @Get("client/:clientId")
    listByClient(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("clientId") clientId: string,
    ) {
        return this.appointments.listByClient(user.companyId, clientId);
    }

}
