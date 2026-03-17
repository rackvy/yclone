import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    branchId?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    costPrice?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    stockQty?: number;

    @IsOptional()
    @IsString()
    sku?: string | null;

    @IsOptional()
    @IsString()
    barcode?: string | null;

    @IsOptional()
    @IsString()
    categoryId?: string | null;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    // Масса
    @IsOptional()
    @IsInt()
    @Min(0)
    netWeight?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    grossWeight?: number | null;

    // Остатки
    @IsOptional()
    @IsInt()
    @Min(0)
    minStock?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    desiredStock?: number;
}
