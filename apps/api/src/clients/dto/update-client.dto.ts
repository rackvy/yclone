import { IsOptional, IsString, MinLength, IsInt, Min, Max, IsIn, IsDateString } from "class-validator";

export class UpdateClientDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    fullName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsDateString()
    birthDate?: string; // YYYY-MM-DD or null to clear

    // Лояльность
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    discountPercent?: number;

    @IsOptional()
    @IsString()
    @IsIn(["all", "services", "products"])
    discountAppliesTo?: string;
}
