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
import { FinanceAccess } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PayrollService } from "./payroll.service";
import { CreateSalaryRuleDto, UpdateSalaryRuleDto, CreateAssignmentDto, ListAssignmentsDto, CalcPayrollDto } from "./dto";

@Controller("api/payroll")
@UseGuards(JwtAuthGuard)
@FinanceAccess()
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  // ==================== SALARY RULES ====================

  @Get("rules")
  findAllRules(@CurrentUser() user: { companyId: string }) {
    return this.payroll.findAllRules(user.companyId);
  }

  @Get("rules/:id")
  findOneRule(
    @CurrentUser() user: { companyId: string },
    @Param("id") id: string,
  ) {
    return this.payroll.findOneRule(user.companyId, id);
  }

  @Post("rules")
  createRule(
    @CurrentUser() user: { companyId: string },
    @Body() dto: CreateSalaryRuleDto,
  ) {
    return this.payroll.createRule(user.companyId, dto);
  }

  @Patch("rules/:id")
  updateRule(
    @CurrentUser() user: { companyId: string },
    @Param("id") id: string,
    @Body() dto: UpdateSalaryRuleDto,
  ) {
    return this.payroll.updateRule(user.companyId, id, dto);
  }

  @Delete("rules/:id")
  deleteRule(
    @CurrentUser() user: { companyId: string },
    @Param("id") id: string,
  ) {
    return this.payroll.deleteRule(user.companyId, id);
  }

  // ==================== ASSIGNMENTS ====================

  @Get("assignments")
  listAssignments(
    @CurrentUser() user: { companyId: string },
    @Query() dto: ListAssignmentsDto,
  ) {
    return this.payroll.listAssignments(user.companyId, dto);
  }

  @Post("assignments")
  createAssignment(
    @CurrentUser() user: { companyId: string },
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.payroll.createAssignment(user.companyId, dto);
  }

  @Delete("assignments/:id")
  deleteAssignment(
    @CurrentUser() user: { companyId: string },
    @Param("id") id: string,
  ) {
    return this.payroll.deleteAssignment(user.companyId, id);
  }

  // ==================== PAYROLL CALCULATION ====================

  @Post("calc")
  calculatePayroll(
    @CurrentUser() user: { companyId: string },
    @Body() dto: CalcPayrollDto,
  ) {
    return this.payroll.calculatePayroll(user.companyId, dto);
  }

  // ==================== PAYROLL RUNS ====================

  @Post("runs")
  createRun(
    @CurrentUser() user: { sub: string; companyId: string },
    @Body() dto: import("./dto/payroll-run.dto").CreatePayrollRunDto,
  ) {
    return this.payroll.createRun(user.companyId, user.sub, dto);
  }

  @Get("runs")
  findAllRuns(
    @CurrentUser() user: { companyId: string },
    @Query() query: import("./dto/payroll-run.dto").ListPayrollRunsQuery,
  ) {
    return this.payroll.findAllRuns(user.companyId, query);
  }

  @Get("runs/:id")
  findOneRun(
    @CurrentUser() user: { companyId: string },
    @Param("id") id: string,
  ) {
    return this.payroll.findOneRun(user.companyId, id);
  }

  @Post("runs/:id/approve")
  approveRun(
    @CurrentUser() user: { sub: string; companyId: string },
    @Param("id") id: string,
  ) {
    return this.payroll.approveRun(user.companyId, id, user.sub);
  }
}
