import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class UpdateAppointmentServiceDto {
    @IsString()
    serviceId!: string;

    @IsNumber()
    sortOrder!: number;
}

export class UpdateAppointmentDto {
    @IsOptional()
    @IsString()
    masterEmployeeId?: string;

    @IsOptional()
    @IsString()
    date?: string;

    @IsOptional()
    @IsString()
    startTime?: string;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsString()
    clientId?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateAppointmentServiceDto)
    services?: UpdateAppointmentServiceDto[];
}
