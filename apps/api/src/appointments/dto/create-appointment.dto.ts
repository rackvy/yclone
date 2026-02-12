import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export enum AppointmentTypeDto {
    service = "service",
    block = "block",
}

export class CreateAppointmentServiceItemDto {
    @IsString()
    serviceId!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class CreateAppointmentDto {
    @IsString()
    branchId!: string;

    // мастер
    @IsString()
    masterEmployeeId!: string;

    @IsEnum(AppointmentTypeDto)
    type!: AppointmentTypeDto;

    // "YYYY-MM-DD"
    @IsString()
    date!: string;

    // "HH:MM"
    @IsString()
    startTime!: string;

    // для service можно null (черновик), для block обычно null
    @IsOptional()
    @IsString()
    clientId?: string;

    // block title/comment
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    // только для type=service
    @IsOptional()
    services?: CreateAppointmentServiceItemDto[];

    // Если хочешь руками задать длительность блока (в минутах, кратно 15)
    @IsOptional()
    @IsInt()
    @Min(15)
    blockDurationMin?: number;
}
