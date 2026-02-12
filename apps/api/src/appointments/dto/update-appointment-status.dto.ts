import { IsEnum, IsOptional, IsString } from "class-validator";
import { AppointmentStatusEnum } from "../appointment-status.enum";

export class UpdateAppointmentStatusDto {
    @IsEnum(AppointmentStatusEnum)
    status!: AppointmentStatusEnum;

    @IsOptional()
    @IsString()
    comment?: string;
}
