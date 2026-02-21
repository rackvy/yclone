import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListShiftsDto {
    @IsOptional()
    @IsDateString()
    date?: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    branchId?: string;
}
