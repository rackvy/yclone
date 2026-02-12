import { IsArray, IsOptional, IsString } from "class-validator";

export class RescheduleAppointmentDto {
    // "YYYY-MM-DD"
    @IsOptional()
    @IsString()
    date?: string;

    // "HH:MM" кратно 15
    @IsOptional()
    @IsString()
    startTime?: string;

    // Если прислали — значит хотим заменить услуги целиком
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    serviceIds?: string[];

    @IsOptional()
    @IsString()
    comment?: string;
}
