import { IsString, IsBoolean, IsOptional, IsInt, IsEnum, Min, IsDateString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SalaryCalcMode, SalaryMinMode } from "./create-salary-rule.dto";
import { ServiceOverrideDto, ProductOverrideDto } from "./overrides.dto";

export class UpdateSalaryRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsBoolean()
  calcByPayments?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRefunds?: boolean;

  @IsOptional()
  @IsEnum(SalaryCalcMode)
  servicesMode?: SalaryCalcMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  servicesValue?: number;

  @IsOptional()
  @IsEnum(SalaryCalcMode)
  productsMode?: SalaryCalcMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  productsValue?: number;

  @IsOptional()
  @IsEnum(SalaryMinMode)
  minMode?: SalaryMinMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  minValue?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServiceOverrideDto)
  serviceOverrides?: ServiceOverrideDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductOverrideDto)
  productOverrides?: ProductOverrideDto[];
}
