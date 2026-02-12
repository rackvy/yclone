import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class BookAppointmentDto {
    @IsString()
    branchId!: string;

    @IsString()
    masterEmployeeId!: string;

    // "YYYY-MM-DD"
    @IsString()
    date!: string;

    // "HH:MM" кратно 15
    @IsString()
    startTime!: string;

    @IsArray()
    @IsString({ each: true })
    serviceIds!: string[];

    @IsOptional()
    @IsString()
    clientId?: string;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;
}
