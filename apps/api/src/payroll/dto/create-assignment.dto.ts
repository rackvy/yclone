import { IsString, IsOptional, IsDateString } from "class-validator";

export class CreateAssignmentDto {
  @IsString()
  ruleId: string;

  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
