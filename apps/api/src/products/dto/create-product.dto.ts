import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProductDto {
    @IsString()
    branchId!: string;

    @IsString()
    @MinLength(2)
    name!: string;

    @IsInt()
    @Min(0)
    price!: number; // рубли

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
}
