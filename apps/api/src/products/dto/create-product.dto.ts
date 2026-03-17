import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProductDto {
    @IsString()
    branchId!: string;

    @IsString()
    @MinLength(2)
    name!: string;

    @IsInt()
    @Min(0)
    price!: number; // Розничная цена в рублях

    @IsOptional()
    @IsInt()
    @Min(0)
    costPrice?: number; // Закупочная цена в рублях

    @IsOptional()
    @IsInt()
    @Min(0)
    stockQty?: number;

    @IsOptional()
    @IsString()
    sku?: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    // Масса
    @IsOptional()
    @IsInt()
    @Min(0)
    netWeight?: number; // Масса нетто в граммах

    @IsOptional()
    @IsInt()
    @Min(0)
    grossWeight?: number; // Масса брутто в граммах

    // Остатки
    @IsOptional()
    @IsInt()
    @Min(0)
    minStock?: number; // Критический остаток

    @IsOptional()
    @IsInt()
    @Min(0)
    desiredStock?: number; // Желаемый остаток
}
