import { IsOptional, IsString, MinLength, IsInt, Min, Max, IsIn, IsDateString } from "class-validator";

export class CreateClientDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    // телефон обязателен по схеме
    @IsString()
    phone!: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsDateString()
    birthDate?: string; // YYYY-MM-DD

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
