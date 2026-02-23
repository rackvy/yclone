import { IsString, IsOptional, IsInt, IsEnum, Min, Max } from "class-validator";
import { SalaryCalcMode } from "./create-salary-rule.dto";

export class ServiceOverrideDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(SalaryCalcMode)
  mode: SalaryCalcMode;

  @IsInt()
  @Min(0)
  value: number;
}

export class ProductOverrideDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(SalaryCalcMode)
  mode: SalaryCalcMode;

  @IsInt()
  @Min(0)
  value: number;
}
