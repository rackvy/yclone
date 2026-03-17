import { IsOptional, IsString, IsDateString } from "class-validator";

export class CreateWaitlistDto {
    @IsString()
    branchId!: string;

    @IsString()
    clientId!: string;

    @IsOptional()
    @IsString()
    serviceId?: string;

    @IsOptional()
    @IsString()
    masterEmployeeId?: string;

    @IsOptional()
    @IsDateString()
    preferredDate?: string;

    @IsOptional()
    @IsString()
    preferredTimeFrom?: string; // HH:MM

    @IsOptional()
    @IsString()
    preferredTimeTo?: string; // HH:MM

    @IsOptional()
    @IsString()
    comment?: string;
}
