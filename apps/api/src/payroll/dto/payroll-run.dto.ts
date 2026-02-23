import { IsOptional, IsString, IsDateString } from "class-validator";

export class CreatePayrollRunDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}

export class ListPayrollRunsQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
