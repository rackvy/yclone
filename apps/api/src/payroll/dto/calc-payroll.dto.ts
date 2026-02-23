import { IsString, IsOptional, IsDateString } from "class-validator";

export class CalcPayrollDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export interface PayrollServiceDetail {
  appointmentId: string;
  date: string;
  serviceName: string;
  baseKopeks: number;
  ruleApplied: string;
  earnedKopeks: number;
}

export interface PayrollProductDetail {
  saleIdOrAppointmentId: string;
  date: string;
  productName: string;
  qty: number;
  revenueKopeks: number;
  ruleApplied: string;
  earnedKopeks: number;
}

export interface PayrollRefundDetail {
  date: string;
  reason: string;
  amountKopeks: number;
}

export interface PayrollEmployeeDetails {
  services: PayrollServiceDetail[];
  products: PayrollProductDetail[];
  refunds: PayrollRefundDetail[];
}

export interface PayrollSummaryRow {
  employeeId: string;
  fullName: string;
  workDaysCount: number;
  servicesKopeks: number;
  productsKopeks: number;
  bonusKopeks: number;
  minimumTopUpKopeks: number;
  totalKopeks: number;
}

export interface PayrollCalcResult {
  summaryRows: PayrollSummaryRow[];
  detailsByEmployee: Record<string, PayrollEmployeeDetails>;
}
