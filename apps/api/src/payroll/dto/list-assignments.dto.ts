import { IsOptional, IsString } from "class-validator";

export class ListAssignmentsDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  ruleId?: string;
}
