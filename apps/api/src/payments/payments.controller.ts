import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CreateRefundDto } from "./dto/create-refund.dto";

@Controller("api")
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly payments: PaymentsService) {}

    // GET /api/payment-methods?branchId=...
    @Get("payment-methods")
    getPaymentMethods(
        @CurrentUser() user: { sub: string; companyId: string },
        @Query("branchId") branchId?: string,
    ) {
        return this.payments.getPaymentMethods(user.companyId, branchId);
    }

    // POST /api/appointments/:id/payments
    @Post("appointments/:id/payments")
    createPayment(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") appointmentId: string,
        @Body() dto: CreatePaymentDto,
    ) {
        // TODO: получить employeeId из user если нужно
        return this.payments.createPayment(user.companyId, appointmentId, dto);
    }

    // POST /api/appointments/:id/refunds
    @Post("appointments/:id/refunds")
    createRefund(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") appointmentId: string,
        @Body() dto: CreateRefundDto,
    ) {
        return this.payments.createRefund(user.companyId, appointmentId, dto);
    }

    // GET /api/appointments/:id/payments
    @Get("appointments/:id/payments")
    getAppointmentPayments(
        @CurrentUser() user: { sub: string; companyId: string },
        @Param("id") appointmentId: string,
    ) {
        return this.payments.getAppointmentPayments(user.companyId, appointmentId);
    }
}
