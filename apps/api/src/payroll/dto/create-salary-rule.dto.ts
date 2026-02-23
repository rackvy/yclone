import { IsString, IsBoolean, IsOptional, IsInt, IsEnum, Min, Max, IsDateString } from "class-validator";

export enum SalaryCalcMode {
  PERCENT = "percent",
  FIXED = "fixed",
}

export enum SalaryMinMode {
  NONE = "none",
  DAILY = "daily",
  MONTHLY = "monthly",
}

export class CreateSalaryRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsBoolean()
  calcByPayments?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeRefunds?: boolean = false;

  @IsEnum(SalaryCalcMode)
  servicesMode: SalaryCalcMode;

  @IsInt()
  @Min(0)
  servicesValue: number;

  @IsEnum(SalaryCalcMode)
  productsMode: SalaryCalcMode;

  @IsInt()
  @Min(0)
  productsValue: number;

  @IsEnum(SalaryMinMode)
  minMode: SalaryMinMode;

  @IsInt()
  @Min(0)
  minValue: number;
}
