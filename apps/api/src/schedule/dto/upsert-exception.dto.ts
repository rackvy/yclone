import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpsertExceptionDto {
    @IsString()
    employeeId!: string;

    // "YYYY-MM-DD"
    @IsString()
    date!: string;

    @IsBoolean()
    isWorkingDay!: boolean;

    @IsOptional()
    @IsString()
    startTime?: string;

    @IsOptional()
    @IsString()
    endTime?: string;
}
