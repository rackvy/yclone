import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpsertExceptionDto {
    employeeId!: string;

    // "YYYY-MM-DD"
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
