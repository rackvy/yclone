import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from "class-validator";
import { CashboxTypeDto } from "./create-cashbox.dto";

export class UpdateCashboxDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(CashboxTypeDto)
    type?: CashboxTypeDto;

    @IsOptional()
    @IsString()
    branchId?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    sortOrder?: number;
}
