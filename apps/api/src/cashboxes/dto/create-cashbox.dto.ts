import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from "class-validator";

export enum CashboxTypeDto {
    cash = "cash",
    bank = "bank",
    other = "other",
}

export class CreateCashboxDto {
    @IsString()
    name!: string;

    @IsEnum(CashboxTypeDto)
    type!: CashboxTypeDto;

    @IsOptional()
    @IsString()
    branchId?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsInt()
    sortOrder?: number;
}
