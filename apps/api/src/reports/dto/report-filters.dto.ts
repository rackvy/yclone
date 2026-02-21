import { IsOptional, IsString, IsDateString } from "class-validator";

export class ReportFiltersDto {
    @IsOptional()
    @IsDateString()
    from?: string; // YYYY-MM-DD

    @IsOptional()
    @IsDateString()
    to?: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    branchId?: string;
}
